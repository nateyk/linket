import hljs from 'highlight.js/lib/core';

// load specific languages only
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import shell from 'highlight.js/lib/languages/shell';
import typescript from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';

// load css
import './github-dark-theme.css';
import './github-theme.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('php', php);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('json', json);

export {hljs};
