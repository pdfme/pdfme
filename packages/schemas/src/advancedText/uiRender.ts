import {UIRenderProps} from "@pdfme/common";
import {AdvancedTextSchema} from "./types";
import {uiRender as parentUiRender} from "../text/uiRender";
import {getUniqueVariableNames} from "./helper";

export const uiRender = async (arg: UIRenderProps<AdvancedTextSchema>) => {
    const {
        value,
        schema,
        rootElement,
        onChange,
        onCustomAttributeChange,
        ...rest
    } = arg;

    let dynamicVariablesStr = JSON.stringify(getUniqueVariableNames(value));

    const renderArgs = {
        value: schema.content || '',
        schema,
        rootElement,
        onChange: (value: string) => {
            if (onChange && onCustomAttributeChange) onCustomAttributeChange('content', value);
        },
        ...rest
    }

    await parentUiRender(renderArgs);

    const textBlock = rootElement.querySelector('#text-' + schema.id);
    if (textBlock) {
        textBlock.addEventListener('keyup', () => {
            const newVarsStr = JSON.stringify(getUniqueVariableNames(textBlock.textContent || ''));
            if (dynamicVariablesStr !== newVarsStr) {
                console.log(`*** triggering now for '${textBlock.textContent}' cos ${dynamicVariablesStr} !== ${newVarsStr}`);
                onChange && textBlock.textContent && onChange(textBlock.textContent);
                dynamicVariablesStr = newVarsStr;
            } else {
                console.log('no change for variables');
            }
        });
    } else {
        console.error('uh oh, textBlock not found');
    }
};