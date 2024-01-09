/* eslint import/prefer-default-export: off */
import path from 'path';
import * as url from 'url';

export function pathCreator(route: string) {
  let indexPath;

  if (process.env.NODE_ENV === 'development') {
    indexPath = url.format({
      protocol: 'http:',
      host: `localhost:1212${`?${route}`}`,
      slashes: true,
    });
  } else {
    indexPath = `${url.format({
      protocol: 'file:',
      pathname: path.join(
        process.platform === 'darwin'
          ? __dirname.split('/').slice(0, -2).join('/')
          : __dirname.split('\\').slice(0, -2).join('/'),
        'dist',
        'renderer',
        'index.html',
      ),
      slashes: false,
    })}?${route}`;
  }

  return indexPath;
}
