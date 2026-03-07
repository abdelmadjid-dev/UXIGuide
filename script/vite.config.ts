import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default {
    plugins: [cssInjectedByJsPlugin()],
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'UXIGuideScript',
            fileName: () => `uxiguide.js`,
            formats: ['iife'] // best for simple <script src="..."> injection
        },
        rollupOptions: {
            external: [], // everything should be bundled
            output: {
                globals: {} // also css should be bundled 
            },
        },
        minify: 'terser', // to load fast
    }
}