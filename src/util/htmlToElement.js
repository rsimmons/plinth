export default function htmlToElement(document, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
}
