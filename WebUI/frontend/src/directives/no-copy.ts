// src/directives/no-copy.ts
import { DirectiveBinding } from 'vue';

const NoCopy = {
    mounted(el: HTMLElement) {
        ['copy','cut','paste','contextmenu'].forEach(evt => {
            el.addEventListener(evt, e => e.preventDefault());
        });
    }
};

export default NoCopy;
