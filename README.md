In order to compile the module, run (on folder `fast-grid`):

```bash
npm install --ignore-scripts
npm run build
```

in order to compile it in test mode, run on fast-grid:

```bash
npm run watch
```

To create a package, execute (on folder `fast-grid`):

```bash
npm run build
npm pack
```

Then, in order to use it in a Next.js app like the one in example-nextjs, run:
```bash
npm install --ignore-scripts
npm run dev/build
```