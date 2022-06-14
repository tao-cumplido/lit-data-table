import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('data-table-caption')
export class DataTableCaption extends LitElement {
	static override styles = css`
		:host {
			display: contents;
		}
	`;

	protected override render() {
		return html`<slot></slot>`;
	}
}
