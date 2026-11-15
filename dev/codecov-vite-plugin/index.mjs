// Adapted from @codecov/vite-plugin 2.0.1 (MIT).
// The published package peers only Vite 4-6. Linket is on Vite 8, and this
// local copy widens that peer so npm ci can install it. Behavior is unchanged.
import { createVitePlugin } from 'unplugin';
import { red, createRollupAsset, checkNodeVersion, normalizeOptions, handleErrors, createSentryInstance, Output, telemetryPlugin } from '@codecov/bundler-plugin-core';
import path from 'node:path';

function hasBundleName(output) {
  return Boolean(output.bundleName);
}

function applyOutputName(output, options) {
  output.setBundleName(output.originalBundleName);
  if (options.name) {
    output.setBundleName(`${output.bundleName}-${options.name}`);
  }
  const format = options.format === 'es' ? 'esm' : options.format;
  output.setBundleName(`${output.bundleName}-${format}`);
}

function patternString(value) {
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

function isSourceMap(fileName) {
  return path.extname(fileName) === '.map';
}

function moduleDisplayName(modulePath, cwd) {
  const relativeModulePath = path.relative(cwd, modulePath.replace('\0', ''));
  if (relativeModulePath.match(/^\.\./)) {
    return relativeModulePath;
  }
  return `.${path.sep}${relativeModulePath}`;
}

function rememberModule(modules, modulePath, moduleInfo, uniqueId, cwd, useOriginalSize) {
  const name = moduleDisplayName(modulePath, cwd);
  const existing = modules.get(name);
  if (existing) {
    existing.chunkUniqueIds.push(uniqueId);
    return;
  }
  const size = useOriginalSize ? moduleInfo.originalLength : moduleInfo.renderedLength;
  modules.set(name, {name, size, chunkUniqueIds: [uniqueId]});
}

function rememberChunkModules(item, modules, uniqueId, cwd, useOriginalSize) {
  for (const [modulePath, moduleInfo] of Object.entries(item?.modules ?? {})) {
    rememberModule(modules, modulePath, moduleInfo, uniqueId, cwd, useOriginalSize);
  }
}

function rememberChunk(chunks, item, fileName, uniqueId) {
  const chunkId = item?.name ?? '';
  chunks.push({
    id: chunkId,
    uniqueId,
    entry: item?.isEntry,
    initial: item?.isDynamicEntry,
    files: [fileName],
    names: [item?.name],
    dynamicImports: item?.dynamicImports ?? [],
  });
}

async function rollupAsset(item, formatString, metaFramework, source) {
  const fileName = item?.fileName ?? '';
  if (isSourceMap(fileName)) {
    return null;
  }
  return createRollupAsset({
    fileName,
    source,
    formatString,
    metaFramework,
  });
}

async function collectAsset(item, context) {
  const asset = await rollupAsset(
    item,
    context.assetFormatString,
    context.metaFramework,
    item.source,
  );
  if (asset) {
    context.assets.push(asset);
  }
}

async function collectChunk(item, context) {
  const asset = await rollupAsset(
    item,
    context.chunkFormatString,
    context.metaFramework,
    item.code,
  );
  if (!asset) {
    return;
  }
  context.assets.push(asset);
  const fileName = item?.fileName ?? '';
  const uniqueId = `${context.counter}-${item?.name ?? ''}`;
  rememberChunk(context.chunks, item, fileName, uniqueId);
  rememberChunkModules(
    item,
    context.modules,
    uniqueId,
    context.cwd,
    context.useOriginalSize,
  );
  context.counter += 1;
}

async function collectItem(item, context) {
  if (item?.type === 'asset') {
    await collectAsset(item, context);
    return;
  }
  if (item?.type === 'chunk') {
    await collectChunk(item, context);
  }
}

function publishBundle(plugin, output, context, options) {
  output.bundler = {name: 'rollup', version: plugin.meta.rollupVersion};
  output.assets = context.assets;
  output.chunks = context.chunks;
  output.modules = Array.from(context.modules.values());
  output.outputPath = options.dir ?? '';
  if (!output.dryRun) {
    return;
  }
  plugin.emitFile({
    type: 'asset',
    fileName: `${output.bundleName}-stats.json`,
    source: output.bundleStatsToJson(),
  });
}

function analysisContext(options, output) {
  const customOptions = {moduleOriginalSize: false, ...options};
  return {
    cwd: process.cwd(),
    assets: [],
    chunks: [],
    modules: new Map(),
    counter: 0,
    metaFramework: output.metaFramework,
    useOriginalSize: customOptions.moduleOriginalSize,
    assetFormatString: patternString(customOptions.assetFileNames),
    chunkFormatString: patternString(customOptions.chunkFileNames),
  };
}

const viteBundleAnalysisPlugin = ({output, pluginName, pluginVersion}) => ({
  version: output.version,
  name: pluginName,
  pluginVersion,
  buildStart: () => {
    output.start();
    output.setPlugin(pluginName, pluginVersion);
  },
  buildEnd: () => {
    output.end();
  },
  writeBundle: async () => {
    await output.write();
  },
  vite: {
    async generateBundle(options, bundle) {
      if (!hasBundleName(output)) {
        red('Bundle name is not present or empty. Skipping upload.');
        return;
      }
      applyOutputName(output, options);
      const context = analysisContext(options, output);
      const items = Object.values(bundle);
      await Promise.all(items.map(item => collectItem(item, context)));
      publishBundle(this, output, context, options);
    },
  },
});

const PLUGIN_NAME = '@codecov/vite-plugin';
const PLUGIN_VERSION = '2.0.1';

function exitOnInvalidOptions(normalizedOptions) {
  const {shouldExit} = handleErrors(normalizedOptions);
  if (shouldExit) {
    process.exit(1);
  }
}

function analysisPlugins(options, output, sentryConfig) {
  if (!options.enableBundleAnalysis) {
    return [];
  }
  return [
    telemetryPlugin({
      sentryClient: sentryConfig.sentryClient,
      sentryScope: sentryConfig.sentryScope,
      telemetry: options.telemetry,
    }),
    viteBundleAnalysisPlugin({
      output,
      pluginName: PLUGIN_NAME,
      pluginVersion: PLUGIN_VERSION,
    }),
  ];
}

const codecovVitePluginFactory = createVitePlugin((userOptions, unpluginMetaContext) => {
  if (checkNodeVersion(unpluginMetaContext)) {
    return [];
  }
  const normalizedOptions = normalizeOptions(userOptions);
  if (!normalizedOptions.success) {
    exitOnInvalidOptions(normalizedOptions);
    return [];
  }
  const options = normalizedOptions.options;
  const sentryConfig = createSentryInstance({
    telemetry: options.telemetry,
    isDryRun: options.dryRun,
    pluginName: PLUGIN_NAME,
    pluginVersion: PLUGIN_VERSION,
    options,
    bundler: unpluginMetaContext.framework,
  });
  const output = new Output(
    options,
    {metaFramework: unpluginMetaContext.framework},
    sentryConfig,
  );
  return analysisPlugins(options, output, sentryConfig);
});

const codecovVitePlugin = codecovVitePluginFactory;
const _internal_viteBundleAnalysisPlugin = viteBundleAnalysisPlugin;

export {_internal_viteBundleAnalysisPlugin, codecovVitePlugin};
