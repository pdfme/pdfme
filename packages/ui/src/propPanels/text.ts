import type { PropPanelProps } from "../types"

// FIXME IMPL
export const renderText = async (arg: PropPanelProps) => {
    const {
        rootElement,
        schema,
        changeSchemas,
        options,
    } = arg;
    rootElement.innerHTML = `<div>Text</div>`
}