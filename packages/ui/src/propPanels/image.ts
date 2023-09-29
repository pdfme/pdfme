import type { PropPanelProps } from "../types"

// FIXME IMPL
export const renderImage = async (arg: PropPanelProps) => {
    const {
        rootElement,
        schema,
        changeSchemas,
        options,
    } = arg;
    rootElement.innerHTML = `<div>Image</div>`
}