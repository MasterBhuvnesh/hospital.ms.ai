import { createProxyMiddleware, type Options } from 'http-proxy-middleware';

export function proxyTo(target: string, pathPrefix?: string) {
  const options: Options = {
    target,
    changeOrigin: true,
    ...(pathPrefix && {
      pathRewrite: { [`^${pathPrefix}`]: pathPrefix },
    }),
  };
  return createProxyMiddleware(options);
}
