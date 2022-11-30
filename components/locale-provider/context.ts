import { createContext } from 'react';
import type { Locale } from '.';

export type LocaleContextProps = Locale & { exist?: boolean };

/**
 * Function createContext<T>( defaultValue: T, ): Context<T>; return { Provider: Provider<T>;
 * Consumer: Consumer<T>; displayName?: string | undefined; }
 */
const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

export default LocaleContext;
