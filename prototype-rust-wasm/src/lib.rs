use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    #[serde(rename = "basePdf")]
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
    pub fields: HashMap<String, String>,
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

/// Internal PDF generation logic using lopdf
fn generate_pdf_internal(template: Template, inputs: Vec<Input>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use lopdf::content::{Content, Operation};
    use lopdf::{dictionary, Document, Object, Stream};

    // Create new PDF document
    let mut doc = Document::with_version("1.5");

    // Convert mm to PDF points (1 mm = 2.834645669 points)
    let mm_to_pt = |mm: f64| mm * 2.834645669;
    let page_width = mm_to_pt(template.base_pdf.width);
    let page_height = mm_to_pt(template.base_pdf.height);

    // Create font dictionary for Helvetica (built-in font)
    let font_id = doc.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    });

    // Create pages array
    let mut page_ids = vec![];

    // Generate a page for each input
    for input in inputs.iter() {
        // Create content stream for this page
        let mut operations = vec![];

        // Begin text
        operations.push(Operation::new("BT", vec![]));

        // Set font and size (Helvetica, 12pt)
        operations.push(Operation::new("Tf", vec!["F1".into(), 12.into()]));

        // Render each schema
        for page_schemas in &template.schemas {
            for schema in page_schemas {
                if schema.schema_type == "text" {
                    // Get text value from input or default content
                    let text = input
                        .fields
                        .get(&schema.name)
                        .or(schema.content.as_ref())
                        .map(|s| s.as_str())
                        .unwrap_or("");

                    if !text.is_empty() {
                        // Convert coordinates: PDF origin is bottom-left, pdfme is top-left
                        let x = mm_to_pt(schema.position.x);
                        let y = page_height - mm_to_pt(schema.position.y) - mm_to_pt(schema.height);

                        // Position text
                        operations.push(Operation::new("Td", vec![x.into(), y.into()]));

                        // Show text
                        operations.push(Operation::new("Tj", vec![Object::string_literal(text)]));

                        // Reset position
                        operations.push(Operation::new("Td", vec![(-x).into(), (-y).into()]));
                    }
                }
            }
        }

        // End text
        operations.push(Operation::new("ET", vec![]));

        // Create content stream
        let content = Content { operations };
        let content_id = doc.add_object(Stream::new(dictionary! {}, content.encode()?));

        // Create resources dictionary
        let resources_id = doc.add_object(dictionary! {
            "Font" => dictionary! {
                "F1" => font_id,
            },
        });

        // Create page dictionary
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "MediaBox" => vec![0.into(), 0.into(), page_width.into(), page_height.into()],
            "Contents" => content_id,
            "Resources" => resources_id,
        });

        page_ids.push(page_id);
    }

    // Create pages dictionary
    let pages_id = doc.add_object(dictionary! {
        "Type" => "Pages",
        "Count" => page_ids.len() as i64,
        "Kids" => page_ids.iter().map(|&id| Object::Reference(id)).collect::<Vec<_>>(),
    });

    // Set parent reference for each page
    for &page_id in &page_ids {
        if let Ok(page) = doc.get_object_mut(page_id) {
            if let Object::Dictionary(ref mut page_dict) = page {
                page_dict.set("Parent", Object::Reference(pages_id));
            }
        }
    }

    // Create catalog
    let catalog_id = doc.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => Object::Reference(pages_id),
    });

    // Set trailer
    doc.trailer.set("Root", Object::Reference(catalog_id));

    // Renumber objects for consistency
    doc.renumber_objects();

    // Compress and save
    doc.compress();

    // Save to buffer
    let mut buffer = Vec::new();
    doc.save_to(&mut buffer)?;

    Ok(buffer)
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
                let mut map = HashMap::new();
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
