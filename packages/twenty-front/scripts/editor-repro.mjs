import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost'});
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'getComputedStyle', 'MutationObserver']) Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
window.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
const React = await import('react');
const {render, screen, cleanup} = await import('@testing-library/react');
const {MantineProvider} = await import('@mantine/core');
const {components} = await import('@blocknote/mantine');
const h = React.createElement;
const {Popover} = components.Generic;
try {
 render(h(MantineProvider, {env:'test'}, h(Popover.Root, {open:false}, h(Popover.Trigger, null, h(components.FormattingToolbar.Button, {label:'Link', mainTooltip:'Link', icon:'L'})), h(Popover.Content,null,'Content'))));
 console.log('RENDERED', screen.getByRole('button', {name:'Link'}).outerHTML);
} finally {cleanup(); dom.window.close();}
