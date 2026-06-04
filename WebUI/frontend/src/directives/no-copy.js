const NoCopy = {
    mounted(el) {
        ['copy', 'cut', 'paste', 'contextmenu'].forEach(evt => {
            el.addEventListener(evt, e => e.preventDefault());
        });
    }
};
export default NoCopy;
