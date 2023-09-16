import type { RenderProps } from "../types"

export const renderText = async (arg: RenderProps) => {
    const {
        value,
        schema,
        rootElement,
        editing,
        onChange,
        onStartEditing,
        stopEditing,
        tabIndex,
        placeholder,
        options,
    } = arg;
    // FIXME implement
    // TODO ここから

    console.log('arg: ', arg)

    const button = document.createElement('button');
    button.textContent = 'text';
    button.addEventListener('click', () => {
        alert('Vanilla Button Clicked');
        //   callback('Vanilla Button Clicked');
    });
    rootElement.appendChild(button);
}