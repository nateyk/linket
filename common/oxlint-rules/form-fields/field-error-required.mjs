/**
 * Shared Oxlint JS plugins for form field UI patterns.
 * @see https://oxc.rs/docs/guide/usage/linter/writing-js-plugins
 */

/** @param {import('estree-jsx').JSXOpeningElement} node */
function isFieldMemberOpening(node, memberName) {
  return (
    node?.type === 'JSXOpeningElement' &&
    node.name?.type === 'JSXMemberExpression' &&
    node.name.object?.type === 'JSXIdentifier' &&
    node.name.object.name === 'Field' &&
    node.name.property?.type === 'JSXIdentifier' &&
    node.name.property.name === memberName
  );
}

/** @param {import('estree-jsx').JSXElement} node */
function isNestedFieldRootElement(node) {
  return isFieldMemberOpening(node.openingElement, 'Root');
}

/**
 * Whether this `Field.Root` subtree contains a `Field.Error` that belongs to this field
 * (not to a nested `Field.Root`).
 * @param {import('estree-jsx').JSXElement} jsxElement
 */
function fieldRootHasOwnFieldError(jsxElement) {
  return scanJsxChildren(jsxElement.children);
}

/**
 * `Field.Root` whose body is only `{children}` / `{props.children}` is a wrapper; callers supply
 * `<Field.Error />` (see `HookForm.Field`). Self-closing `<Field.Root {...props} />` also forwards
 * children via props and has no static JSX children.
 * @param {import('estree-jsx').JSXElement} jsxElement
 */
function isFieldRootWithForwardedOrStaticallyUnknownChildren(jsxElement) {
  const open = jsxElement.openingElement;
  if (open.selfClosing) {
    return true;
  }
  const meaningful = jsxElement.children.filter(
    c => !(c.type === 'JSXText' && !c.value.trim()),
  );
  if (meaningful.length === 0) {
    return false;
  }
  if (
    meaningful.length === 1 &&
    meaningful[0].type === 'JSXExpressionContainer'
  ) {
    const e = meaningful[0].expression;
    if (e?.type === 'Identifier' && e.name === 'children') {
      return true;
    }
    if (
      e?.type === 'MemberExpression' &&
      !e.computed &&
      e.object?.type === 'Identifier' &&
      e.object.name === 'props' &&
      e.property?.type === 'Identifier' &&
      e.property.name === 'children'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * @param {import('estree-jsx').JSXElement['children']} children
 */
function scanJsxChildren(children) {
  for (const child of children) {
    if (child.type === 'JSXText' && !child.value.trim()) {
      continue;
    }
    if (child.type === 'JSXElement') {
      if (isFieldMemberOpening(child.openingElement, 'Error')) {
        return true;
      }
      if (isNestedFieldRootElement(child)) {
        continue;
      }
      if (scanJsxChildren(child.children)) {
        return true;
      }
      continue;
    }
    if (child.type === 'JSXFragment') {
      if (scanJsxChildren(child.children)) {
        return true;
      }
      continue;
    }
    if (child.type === 'JSXExpressionContainer') {
      if (scanExpressionForFieldError(child.expression)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {import('estree-jsx').Expression | import('estree-jsx').Super | null} expr
 */
function scanExpressionForFieldError(expr) {
  if (expr == null) {
    return false;
  }
  switch (expr.type) {
    case 'JSXElement':
      if (isFieldMemberOpening(expr.openingElement, 'Error')) {
        return true;
      }
      if (isNestedFieldRootElement(expr)) {
        return false;
      }
      return scanJsxChildren(expr.children);
    case 'JSXFragment':
      return scanJsxChildren(expr.children);
    case 'ChainExpression':
      return scanExpressionForFieldError(expr.expression);
    case 'LogicalExpression':
      return (
        scanExpressionForFieldError(expr.left) ||
        scanExpressionForFieldError(expr.right)
      );
    case 'ConditionalExpression':
      return (
        scanExpressionForFieldError(expr.consequent) ||
        scanExpressionForFieldError(expr.alternate)
      );
    case 'ArrayExpression':
      return expr.elements.some(
        el => el != null && el.type !== 'SpreadElement' && scanExpressionForFieldError(el),
      );
    case 'ParenthesizedExpression':
      return scanExpressionForFieldError(expr.expression);
    case 'AssignmentExpression':
      return scanExpressionForFieldError(expr.right);
    case 'SequenceExpression':
      return expr.expressions.some(scanExpressionForFieldError);
    case 'CallExpression':
    case 'OptionalCallExpression':
      return expr.arguments.some(
        arg => arg.type !== 'SpreadElement' && scanExpressionForFieldError(arg),
      );
    default:
      return false;
  }
}

const fieldRootRequiresFieldErrorRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require `<Field.Error />` inside every `<Field.Root>` so validation and hook-form errors surface consistently.',
    },
    schema: [],
    messages: {
      missingFieldError:
        '`<Field.Root>` must include `<Field.Error />` in the same field (not only inside a nested `<Field.Root>`).',
    },
  },

  /** @param {import('eslint').Rule.RuleContext} context */
  create(context) {
    return {
      /** @param {import('estree-jsx').JSXOpeningElement} node */
      JSXOpeningElement(node) {
        if (!isFieldMemberOpening(node, 'Root')) {
          return;
        }
        if (node.parent?.type !== 'JSXElement') {
          return;
        }
        const jsxElement = node.parent;
        if (jsxElement.openingElement !== node) {
          return;
        }
        if (isFieldRootWithForwardedOrStaticallyUnknownChildren(jsxElement)) {
          return;
        }
        if (fieldRootHasOwnFieldError(jsxElement)) {
          return;
        }
        context.report({
          node,
          messageId: 'missingFieldError',
        });
      },
    };
  },
};

export default {
  meta: {
    name: 'form-fields',
  },
  rules: {
    'field-root-requires-field-error': fieldRootRequiresFieldErrorRule,
  },
};
