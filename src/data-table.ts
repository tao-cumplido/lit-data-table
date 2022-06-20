import type { KeyFn } from 'lit/directives/repeat';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { choose } from 'lit/directives/choose.js';
import { map } from 'lit/directives/map.js';
import { repeat } from 'lit/directives/repeat.js';
import { when } from 'lit/directives/when.js';

import type { ColumnDefinition, Comparator, HeaderRenderer, SortState } from './types';
import { DataTableCaption } from './data-table-caption.js';
import { baseComparator, spaceList } from './utility.js';

function columnClass<T>(column: ColumnDefinition<T>, index: number) {
	return spaceList('cell', `column-${index}`, column.id);
}

@customElement('data-table')
export class DataTable<T = unknown> extends LitElement {
	static renderHeader: HeaderRenderer<unknown> = ({ table, column, sortState }) => html`
		<div style="display: flex; justify-content: space-between">
			${column.header}
			${when(
				column.sortable,
				() => html`
					<div style="display: inline-flex; align-items: center; gap: 0.5em">
						${when(
							table.multiSort && sortState,
							() => html`
								<button style="all: unset; cursor: pointer" @click=${() => table.clearColumnSort(column)}>×</button>
								<div>${sortState?.priority}</div>
							`,
						)}
						<button style="all: unset; cursor: pointer" @click=${() => table.toggleColumnSort(column)}>
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

	private readonly sortStates = new Map<ColumnDefinition<T>, SortState>();

	private caption?: DataTableCaption;

	@property({ attribute: false })
	data: T[] = [];

	@property({ attribute: false })
	columns: ReadonlyArray<ColumnDefinition<T>> = [];

	@property({ attribute: false })
	// @ts-expect-error
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	keyFunction: KeyFn<T> = (item, index) => item?.id ?? index;

	@property({ attribute: false })
	renderHeader?: HeaderRenderer<T>;

	@property({ type: Number })
	pageSize = 0;

	@property({ type: Number })
	pageIndex = 0;

	@property({ type: Boolean })
	multiSort = false;

	get pageCount(): number {
		return this.pageSize > 0 ? Math.ceil(this.data.length / this.pageSize) : 0;
	}

	private sortData() {
		const priorityOrder = [...this.sortStates.entries()].sort((a, b) => a[1].priority - b[1].priority);

		this.data.sort((rowA, rowB) => {
			for (const [column, { direction }] of priorityOrder) {
				const result = (() => {
					if (typeof column.sortable === 'object') {
						return column.sortable.comparator(rowA, rowB);
					}

					const comparator: Comparator<T> = baseComparator(
						(row) => column.render(row, { rowIndex: -1, table: this, column }),
						(valueA, valueB) => {
							if (typeof valueA === 'number' && typeof valueB === 'number') {
								return valueA - valueB;
							}

							const stringA = String(valueA);
							const stringB = String(valueB);

							if (stringA === stringB) {
								return 0;
							}

							return stringA < stringB ? -1 : 1;
						},
					);

					return comparator(rowA, rowB);
				})();

				if (result) {
					return result * direction;
				}
			}

			return 0;
		});
	}

	private setColumnSort(column: ColumnDefinition<T>, direction: -1 | 0 | 1) {
		const sortState = this.sortStates.get(column);
		let shouldSort = false;

		if (sortState && direction && sortState.direction !== direction) {
			this.sortStates.set(column, { ...sortState, direction });
			shouldSort = true;
		} else if (sortState && !direction) {
			this.sortStates.delete(column);
			[...this.sortStates.entries()]
				.sort((a, b) => a[1].priority - b[1].priority)
				.forEach((entry, index) => {
					this.sortStates.set(entry[0], { ...entry[1], priority: index + 1 });
				});

			shouldSort = this.sortStates.size > 0;
		} else if (!sortState && direction) {
			this.sortStates.set(column, {
				direction,
				priority: [...this.sortStates.values()].reduce((result, { priority }) => Math.max(result, priority + 1), 1),
			});
			shouldSort = true;
		}

		if (shouldSort) {
			this.sortData();
		}

		this.requestUpdate();
	}

	protected override createRenderRoot() {
		return this;
	}

	protected override render() {
		const pageFactor = this.pageIndex * this.pageSize;
		const displayData = this.getDisplayData();

		const caption = [...this.children].find(
			(element): element is DataTableCaption => element instanceof DataTableCaption,
		);

		if (caption) {
			this.caption = caption;
		}

		return html`
			<table>
				${when(
					this.caption,
					() => html`
						<caption>
							${this.caption}
						</caption>
					`,
				)}
				<thead>
					<tr>
						${map(this.columns, (column, index) => {
							const state = {
								table: this,
								column,
								sortState: this.sortStates.get(column),
							};

							const render = this.renderHeader ?? DataTable.renderHeader;

							return html`<th scope="col" class=${columnClass(column, index)}>${
								// @ts-expect-error
								render(state)
							}</th>`;
						})}
					</tr>
				</thead>
				<tbody>
					${repeat(
						displayData,
						this.keyFunction,
						(row, rowIndex) => html`
							<tr>
								${map(
									this.columns,
									(column, columnIndex) => html`
										<td class=${columnClass(column, columnIndex)}>
											${column.render(row, {
												rowIndex: rowIndex + pageFactor,
												table: this,
												column,
											})}
										</td>
									`,
								)}
							</tr>
						`,
					)}
				</tbody>
			</table>
		`;
	}

	clearTableSort(): void {
		this.sortStates.clear();
		this.requestUpdate();
	}

	clearColumnSort(column: ColumnDefinition<T>): void {
		this.setColumnSort(column, 0);
	}

	toggleColumnSort(column: ColumnDefinition<T>): void {
		const sortState = this.sortStates.get(column);

		if (!this.multiSort) {
			this.clearTableSort();
		}

		this.setColumnSort(column, ((sortState?.direction ?? -1) * -1) as -1 | 1);
	}

	getDisplayData(): readonly T[] {
		if (this.pageSize) {
			const start = this.pageIndex * this.pageSize;
			const end = start + this.pageSize;
			return this.data.slice(start, end);
		}

		return this.data;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'data-table': DataTable;
	}
}
