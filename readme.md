# Simple data element

> A customizable web component for simple data tables

[![NPM Version][npm-image]][npm-url]

Custom element to render data lists in a table in a declarative way. The element is powered by [Lit](https://lit.dev/) and works well with it but can also be used without Lit. It supports sortable columns and even multi-sort across columns out of the box.

:warning: The package is published only in ESM format, which is supported by most bundlers nowadays.

## Example usage

```html
<html>
	<body>
		<data-table></data-table>
	</body>
</html>
```

```js
import { html } from 'lit';
import 'lit-data-table';

const table = document.querySelector('data-table');

table.columns = [
	{
		header: 'Name',
		render: ({ name }) => name,
		sortable: true,
	},
	{
		header: 'Role',
		render: ({ role }) => role,
	},
	{
		render: (_, { rowIndex, table }) => html`
			<button @click=${() => {
				table.data.splice(rowIndex, 1);
				table.requestUpdate();
			}}>🗑</button>
		`,
	},
];

table.data = [
	{
		name: 'Jane Doe',
		role: 'Administrator',
	},
	{
		name: 'Juana Pérez',
		role: 'User',
	},
];
```

The above example would render three columns: a sortable name column, an unsortable role column and a third column without header with a delete button for each row. Note that using Lit templates is only for convenience and not required. Lit can also render DOM nodes, e.g. created with `document.createElement`.

The `data-table` element renders all its content in Light DOM and doesn't use any CSS which allows for easier styling and complete visual customization. Some inline styling is applied by default for header cell contents but these can be overridden by implementing a custom `DataTable.renderHeader` function. Note that a custom implementation also needs to include controls for sorting if sorting is required. Here is the default implementation for reference:

```js
DataTable.renderHeader = ({ table, column, sortState }) => html`
	<div style="display: flex; justify-content: space-between">
		${column.header}
		${when(
			column.sortable,
			() => html`
				<div style="display: inline-flex; align-items: center; gap: 0.5em">
					${when(
						table.multiSort && sortState,
						() => html`
							<button
								style="all: unset; cursor: pointer"
								@click=${() => table.clearColumnSort(column)}
							>×</button>
							<div>${sortState?.priority}</div>
						`,
					)}
					<button
						style="all: unset; cursor: pointer"
						@click=${() => table.toggleColumnSort(column)}
					>
						${choose(
							sortState?.direction,
							[
								[-1, () => '↓'],
								[1, () => '↑'],
							],
							() => '↕',
						)}
					</button>
				</div>
			`,
		)}
	</div>
`;
```

On CodeSandbox a more complex [live example](https://codesandbox.io/s/epic-meninsky-6tfuz9?file=/src/index.ts) can be found.

## Pagination

The table element doesn't provide custom controls for pagination but can render paginated views of the data by setting the `pageSize` and `pageIndex` properties (can also be set as attributes on the element).

## Accessibility

The table element provides the bare minimum for accessibility: it sets the `scope="col"` attribute on `th` elements. Captions can be added with the `data-table-caption` element.

The following markup

```html
<data-table>
	<data-table-caption>My table caption</data-table-caption>
</data-table>
```

will be converted to the following DOM structure at runtime

```html
<data-table>
	<table>
		<caption>
			<data-table-caption>My table caption</data-table-caption>
		</caption>
		<thead>
			<tr>
				<th scope="col" class="cell column-0"></th>
				...
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="cell column-0"></td>
				...
			</tr>
		</tbody>
	</table>
</data-table>
```

Since the `data-table` element is the container for the native `table` element, the `role`, `aria-labelledby` and `tabindex` attributes can be set on the `data-table` element directly. Refer to [this article](https://adrianroselli.com/2020/11/under-engineered-responsive-tables.html) by Adrian Roselli for more information.

As the `data-table` renders everything in Light DOM, no custom styles are applied, and it is advised to set `display: block` on the element since it is not the default for custom elements.

## API

```ts
import type { KeyFn } from 'lit/directives/repeat';

/**
 * Sort comparator callback passed to Array.prototype.sort.
 * Should be implemented for ascending order, descending order is automatically inverted by the element.
 */
export type Comparator<T> = (valueA: T, valueB: T) => number;

export interface ColumnDefinition<T> {
	/**
	 * Render callback for data cells of this column.
	 */
	readonly render: (row: T, state: { rowIndex: number; table: DataTable<T>; column: ColumnDefinition<T> }) => Renderable;
	/**
	 * Added as CSS class to th and td elements.
	 */
	readonly id?: string;
	/**
	 * Header content. Usually just a string label.
	 */
	readonly header?: Renderable;
	/**
	 * Enable sorting on this column.
	 */
	readonly sorable?: boolean | { comparator: Comparator<T> }
}

export interface SortState {
	/**
	 * Sort direction: -1 = descending; 1 = ascending
	 */
	readonly direction: -1 | 1;
	/**
	 * Sort order priority when multi-sort is enabled.
	 */
	readonly priority: number;
}

export type HeaderRenderer<T> = (state: { table: DataTable<T>; column: ColumnDefinition<T>; sortState?: SortState }) => Renderable;

/**
 * Utility for creating sort comparators for column definitions.
 * Nullable values are automatically sorted at the end.
 * @param selector - Callback to pick the compare value for both rows A and B.
 * @param matcher - Comparator callback called for selected values A and B when both are defined.
 * @returns Comparator callback for column definitions.
 */
export function baseComparator<S, T>(selector: (source: S) => T, matcher: Comparator<NonNullable<T>>): Comparator<S>;

/**
 * Utility for creating sort comparators for text fields.
 * Uses String.prototype.localeCompare under the hood.
 * @param selector - Callback to pick the compare value for both rows A and B.
 * @param locales - One or more locales passed to localeCompare.
 * @param collatorOptions - Options passed to localeCompare.
 * @returns Comparator callback for column definitions.
 */
export function textComparatory<T>(selector: (source: T) => string | null | undefined, locales?: string | string[], collatorOptions?: Intl.CollatorOptions): Comparator<T>;

/**
 * Utility for creating sort comparators for number fields.
 * Uses String.prototype.localeCompare under the hood.
 * @param selector - Callback to pick the compare value for both rows A and B.
 * @returns Comparator callback for column definitions.
 */
export function numberComparatory<T>(selector: (source: T) => number | null | undefined): Comparator<T>;

/**
 * Class for <data-table> elements. 
 * @typeParam T - Type of row data.
 */
export class DataTable<T> {
	/**
	 * The data to render. Note that with sorting enabled, the passed array is sorted in place.
	 */
	data: T[] = [];

	/**
	 * List of column definitions.
	 */
	columns: readonly ColumnDefinition<T>[] = [];

	/**
	 * Rows are rendered with Lit's repeat directive. The key function returns a guaranteed unique key for a row.
	 * It defaults to the `id` property if available and uses the list index as fallback.
	 * See https://lit.dev/docs/templates/lists/#the-repeat-directive
	 */
	keyFunction: KeyFn<T> = (row, index) => row?.id ?? index;

	/**
	 * Callback that returns something renderable by Lit, usually a Lit template or a DOM element.
	 * The return value is rendered as content of each <th> element.
	 * The callback can be set statically for all instances or per instance.
	 */
	static renderHeader: HeaderRenderer<unknown>; // defaults to implementation shown above
	renderHeader?: HeaderRenderer<T>;

	/**
	 * Set to true to enable multisorting across columns. Can also be set as attribute on the element.
	 */
	multiSort: boolean = false;

	/**
	 * Enable pagination by setting a page size > 0. Can also be set as attribute on the element.
	 */
	pageSize: number = 0;

	/**
	 * Index of current page to render. Can also be set as attribute on the element.
	 */
	pageIndex: number = 0;

	/**
	 * Number of pages in total.
	 */
	readonly pageCount: number;

	/**
	 * Reset sort state on all columns.
	 */
	clearTableSort(): void;

	/**
	 * Reset sort state on given column.
	 */
	clearColumnSort(column: ColumnDefinition<T>): void;

	/**
	 * Toggle between ascending and descending sort state for given column.
	 * When the sort state is unset it will start with ascending order.
	 */
	toggleColumnSort(column: ColumnDefinition<T>): void;
}
```

[npm-image]: https://img.shields.io/npm/v/lit-data-table.svg
[npm-url]: https://npmjs.org/package/lit-data-table
