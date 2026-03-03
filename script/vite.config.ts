export default {
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