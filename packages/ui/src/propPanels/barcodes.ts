import type { PropPanelProps } from "../types"

// FIXME IMPL
export const renderBarcode = async (arg: PropPanelProps) => {
    const {
        rootElement,
        schema,
        changeSchemas,
        options,
    } = arg;
    rootElement.innerHTML = `<div>Barcode</div>`
    
}