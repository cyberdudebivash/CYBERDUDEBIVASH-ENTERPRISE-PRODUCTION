/// <reference types="node" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';

  type NextFunction = (err?: any) => void;

  interface Request extends IncomingMessage {
    body: any;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    headers: Record<string, string | string[] | undefined>;
    method: string;
    url: string;
    path: string;
    ip: string;
  }

  interface Response extends ServerResponse {
    json(data: any): void;
    send(data: any): void;
    status(code: number): this;
    set(field: string, value: string): this;
    setHeader(name: string, value: string | number | string[]): this;
    end(data?: any): void;
    sendFile(path: string, options?: any, callback?: (err?: any) => void): void;
  }

  interface Router {
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    use(...handlers: any[]): this;
  }

  type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

  interface Application extends Router {
    listen(port: number, callback?: () => void): any;
    listen(port: number, host: string, callback?: () => void): any;
  }

  interface ExpressStatic {
    (): Application;
    json(): RequestHandler;
    urlencoded(options?: { extended?: boolean }): RequestHandler;
    static(root: string, options?: any): RequestHandler;
    Router(): Router;
  }

  const express: ExpressStatic;
  export = express;
}

declare module 'react' {
  export type ReactNode = JSX.Element | string | number | boolean | null | undefined | ReactNode[];
  export type ReactElement = JSX.Element;
  export type RefObject<T> = { current: T | null };
  export type MutableRefObject<T> = { current: T };
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type ChangeEvent<T = Element> = { target: T & { value: string; checked?: boolean; files?: FileList | null } };
  export type FormEvent<T = Element> = { preventDefault: () => void; target: T };
  export type MouseEvent<T = Element> = { preventDefault: () => void; stopPropagation: () => void; target: T; currentTarget: T };
  export type KeyboardEvent<T = Element> = { key: string; preventDefault: () => void; target: T };
  export type CSSProperties = { [key: string]: string | number | undefined };
  export type ComponentType<P = {}> = FC<P>;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => JSX.Element | null;

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): RefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useContext<T>(context: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function memo<T extends ComponentType<any>>(component: T): T;
  export function lazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): T;
  export function createElement(type: any, props?: any, ...children: any[]): JSX.Element;
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => JSX.Element | null): FC<P & { ref?: RefObject<T> }>;
  export function isValidElement(obj: any): obj is JSX.Element;
  export function cloneElement(element: JSX.Element, props?: any, ...children: any[]): JSX.Element;

  export const StrictMode: FC<{ children?: ReactNode }>;
  export const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>;
  export const Fragment: FC<{ children?: ReactNode }>;

  export const Children: {
    map: (children: any, fn: any) => any[];
    forEach: (children: any, fn: any) => void;
    count: (children: any) => number;
    toArray: (children: any) => any[];
    only: (children: any) => any;
  };

  interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
    displayName?: string;
  }

  export default {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useContext,
    createContext,
    memo,
    lazy,
    Suspense,
    Fragment,
    StrictMode,
    createElement,
    forwardRef,
    isValidElement,
    cloneElement,
    Children,
  };
}

declare namespace React {
  type ReactNode = import('react').ReactNode;
  type ReactElement = import('react').ReactElement;
  type FC<P = {}> = import('react').FC<P>;
  type RefObject<T> = import('react').RefObject<T>;
  type MutableRefObject<T> = import('react').MutableRefObject<T>;
  type Dispatch<A> = import('react').Dispatch<A>;
  type SetStateAction<S> = import('react').SetStateAction<S>;
  type ChangeEvent<T = Element> = import('react').ChangeEvent<T>;
  type FormEvent<T = Element> = import('react').FormEvent<T>;
  type MouseEvent<T = Element> = import('react').MouseEvent<T>;
  type KeyboardEvent<T = Element> = import('react').KeyboardEvent<T>;
  type CSSProperties = import('react').CSSProperties;
  type ComponentType<P = {}> = import('react').ComponentType<P>;
}

declare module 'react-dom' {
  export function render(element: any, container: Element | null, callback?: () => void): void;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | null): { render: (element: any) => void };
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): JSX.Element;
  export function jsxs(type: any, props: any, key?: any): JSX.Element;
  export const Fragment: any;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface ElementAttributesProperty { props: {}; }
  interface ElementChildrenAttribute { children: {}; }
}
