# @netless/slide-prefetch

Simple script to prefetch packed slide data on navigation.

### Usage

- [Web](./docs/Web.md)
- [Electron](./docs/Electron.md)

### Additional Steps to Use it in Webpack 4

If you are using old bundlers which does not support new javascript syntax.
You may encounter errors when use this library. Especially these two:

- Logical OR Operator.

  ```ts
  // in ./src/utils.ts
  export function openCache(cacheName: string) {
    return (cachePromise ||= caches.open(cacheName));
  }
  ```

- `import.meta`

  ```js
  // in ./node_modules/@zip.js/zip.js/lib/core/codecs/codec-pool-worker.js
  workerData.worker = new Worker(new URL(workerData.scripts[0], import.meta.url));
  ```

While it is encouraged to use new bundlers (vite, webpack5, etc.),
here is a workaround.

```bash
npm i -D \
  babel-loader @babel/core @babel/preset-env \
  @babel/plugin-proposal-logical-assignment-operators \
  @open-wc/webpack-import-meta-loader
```

**webpack.config.js**

```js
{
  resolve: {
    extensions: ['js', '.mjs', 'ts', 'tsx']
  },
  module:{
    rules: [
      {
        test: /slide-prefetch\/dist\/index\.mjs$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-logical-assignment-operators']
          }
        }
      },
      {
        test: /@zip\.js\/zip\.js\/lib\/core\/codecs\/codec-pool-worker\.js$/,
        use: {
          loader: '@open-wc/webpack-import-meta-loader'
        }
      }
    }
  }
}
```

### Develop

```bash
npm run build
npm run test:web
npm run test:electron
```

## License

The MIT License.
