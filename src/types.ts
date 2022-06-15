import type { TemplateResult } from 'lit';
import type { DirectiveClass, DirectiveParameters, DirectiveResult } from 'lit/directive';

import type { DataTable } from './data-table';

declare module 'lit/directive' {
	export interface DirectiveResult<C extends DirectiveClass = DirectiveClass> {
		['_$litDirective$']: C;
		values: DirectiveParameters<InstanceType<C>>;
	}
}

export type RenderPrimitive = null | undefined | boolean | number | string | symbol | bigint;
export type RenderUnit<T extends Node> = RenderPrimitive | DirectiveResult | TemplateResult | T;
export type Renderable<T extends Node> = RenderUnit<T> | Iterable<RenderUnit<T>>;

export interface ColumnDefinition<T> {
	readonly render: (row: T, state: ColumnRenderState<T>) => Renderable<Element>;
	readonly id?: string;
	readonly header?: Renderable<Element>;
	readonly sortable?: boolean | SortConfig<T>;
}

export interface ColumnRenderState<T> {
	readonly rowIndex: number;
	readonly table: DataTable<T>;
	readonly column: ColumnDefinition<T>;
}

export type Comparator<T> = (valueA: T, valueB: T) => number;

export interface SortConfig<T> {
	readonly comparator: Comparator<T>;
}

export interface SortState {
	readonly direction: -1 | 1;
	readonly priority: number;
}

export interface HeaderRenderState<T> {
	readonly table: DataTable<T>;
	readonly column: ColumnDefinition<T>;
	readonly sortState?: SortState;
}

export type HeaderRenderer<T> = (state: HeaderRenderState<T>) => Renderable<Element>;
