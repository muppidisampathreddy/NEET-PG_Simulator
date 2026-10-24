import DOMPurify from 'dompurify';

// Question text/options are admin-authored HTML (tables, <b>, <sub>…); strip anything executable.
export const clean = (html: string) => DOMPurify.sanitize(html);
