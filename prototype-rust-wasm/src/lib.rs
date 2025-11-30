use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use console_error_panic_hook;

/// Initialize panic hook for better error messages in browser
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();
}

/// Template structure matching @pdfme/common Template type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct Template {
    #[wasm_bindgen(skip)]
    pub base_pdf: BasePdf,
    #[wasm_bindgen(skip)]
    pub schemas: Vec<Vec<Schema>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasePdf {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schema {
    pub name: String,
    #[serde(rename = "type")]
    pub schema_type: String,
    pub position: Position,
    pub width: f64,
    pub height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

/// Input data for PDF generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Input {
    #[serde(flatten)]
    pub fields: std::collections::HashMap<String, String>,
}

/// Generate PDF from template and inputs
///
/// # Arguments
/// * `template_json` - JSON string of template
/// * `inputs_json` - JSON string of inputs array
///
/// # Returns
/// Uint8Array containing the PDF bytes
#[wasm_bindgen]
pub fn generate(template_json: &str, inputs_json: &str) -> Result<Vec<u8>, JsValue> {
    let template: Template = serde_json::from_str(template_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse template: {}", e)))?;

    let inputs: Vec<Input> = serde_json::from_str(inputs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse inputs: {}", e)))?;

    generate_pdf_internal(template, inputs)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Internal PDF generation logic (non-wasm)
fn generate_pdf_internal(template: Template, inputs: Vec<Input>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use printpdf::*;

    // A4サイズをmmで (210 x 297)
    let width_mm = Mm(template.base_pdf.width);
    let height_mm = Mm(template.base_pdf.height);

    // PDFドキュメント作成
    let (mut doc, page1, layer1) = PdfDocument::new(
        "PDFme Generated",
        width_mm,
        height_mm,
        "Layer 1"
    );

    // 各入力データに対してページを生成
    for (input_idx, input) in inputs.iter().enumerate() {
        let current_page = if input_idx == 0 {
            page1
        } else {
            doc.add_page(width_mm, height_mm, "Layer 1").0
        };

        let current_layer = doc.get_page(current_page).get_layer(layer1);

        // 各スキーマ（フィールド）をレンダリング
        for page_schemas in &template.schemas {
            for schema in page_schemas {
                render_schema(&current_layer, schema, input, &template)?;
            }
        }
    }

    // PDFをバイト配列に保存
    let mut buffer = Vec::new();
    doc.save(&mut buffer)?;

    Ok(buffer)
}

/// Render a single schema field
fn render_schema(
    layer: &PdfLayerReference,
    schema: &Schema,
    input: &Input,
    template: &Template,
) -> Result<(), Box<dyn std::error::Error>> {
    use printpdf::*;

    match schema.schema_type.as_str() {
        "text" => {
            // テキスト値を取得
            let text = input.fields.get(&schema.name)
                .or(schema.content.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("");

            // フォント設定
            let font = layer.get_builtin_font(BuiltinFont::Helvetica)?;

            // 座標変換: PDFは左下原点、pdfmeは左上原点
            let x = Mm(schema.position.x);
            let y = Mm(template.base_pdf.height - schema.position.y - schema.height);

            // テキスト描画
            layer.use_text(
                text,
                12.0,
                x,
                y,
                &font,
            );
        }
        "image" => {
            // 画像は後で実装
            // TODO: Image rendering
        }
        "qrcode" => {
            // QRコードは後で実装
            // TODO: QR code rendering
        }
        _ => {
            // 未対応のスキーマタイプ
            eprintln!("Unsupported schema type: {}", schema.schema_type);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_simple_pdf() {
        let template = Template {
            base_pdf: BasePdf {
                width: 210.0,
                height: 297.0,
            },
            schemas: vec![vec![Schema {
                name: "name".to_string(),
                schema_type: "text".to_string(),
                position: Position { x: 10.0, y: 10.0 },
                width: 100.0,
                height: 10.0,
                content: None,
            }]],
        };

        let inputs = vec![Input {
            fields: {
                let mut map = std::collections::HashMap::new();
                map.insert("name".to_string(), "John Doe".to_string());
                map
            },
        }];

        let result = generate_pdf_internal(template, inputs);
        assert!(result.is_ok());

        let pdf_bytes = result.unwrap();
        assert!(!pdf_bytes.is_empty());
        assert!(pdf_bytes.starts_with(b"%PDF"));
    }
}
