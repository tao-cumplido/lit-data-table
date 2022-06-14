import type { Comparator } from './types';

export function isDefined<T>(value: T): value is NonNullable<T> {
	return typeof value !== 'undefined' && value !== null;
}

export function spaceList(...values: ReadonlyArray<string | undefined | Record<string, boolean>>): string {
	return values
		.flatMap((value) => {
			if (!value) {
				return [];
			}

			if (typeof value === 'string') {
				return value;
			}

			return Object.entries(value).flatMap(([key, condition]) => (condition ? key : []));
		})
		.join(' ');
}

export function baseComparator<S, T>(selector: (source: S) => T, matcher: Comparator<NonNullable<T>>): Comparator<S> {
	return (sourceA, sourceB) => {
		const a = selector(sourceA);
		const b = selector(sourceB);

		if (a === b || (!isDefined(a) && !isDefined(b))) {
			return 0;
		}

		if (isDefined(a) && isDefined(b)) {
			return matcher(a, b);
		}

		return isDefined(a) ? -1 : 1;
	};
}

export function textComparator<T>(
	selector: (source: T) => string | undefined,
	locales?: string | string[],
	collatorOptions?: Intl.CollatorOptions,
): Comparator<T> {
	return baseComparator(selector, (a, b) => a.localeCompare(b, locales, collatorOptions));
}

export function numberComparator<T>(selector: (source: T) => number | undefined): Comparator<T> {
	return baseComparator(selector, (a, b) => a - b);
}
