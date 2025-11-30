use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BasePdf {
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Position {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Schema {
    name: String,
    #[serde(rename = "type")]
    schema_type: String,
    position: Position,
    width: f64,
    height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Template {
    base_pdf: BasePdf,
    schemas: Vec<Vec<Schema>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Input {
    #[serde(flatten)]
    fields: HashMap<String, String>,
}

/// Generate PDF from template and inputs
///
/// Args:
///     template (dict): Template definition with basePdf and schemas
///     inputs (list): List of input data dictionaries
///
/// Returns:
///     bytes: PDF file as bytes
///
/// Example:
///     >>> import pdfme
///     >>> template = {
///     ...     "basePdf": {"width": 210, "height": 297},
///     ...     "schemas": [[
///     ...         {
///     ...             "name": "name",
///     ...             "type": "text",
///     ...             "position": {"x": 20, "y": 20},
///     ...             "width": 100,
///     ...             "height": 10
///     ...         }
///     ...     ]]
///     ... }
///     >>> inputs = [{"name": "John Doe"}]
///     >>> pdf_bytes = pdfme.generate(template, inputs)
///     >>> with open("output.pdf", "wb") as f:
///     ...     f.write(pdf_bytes)
#[pyfunction]
fn generate(template: &PyDict, inputs: &PyList) -> PyResult<Vec<u8>> {
    // Convert Python dict to JSON string
    let template_json = pythonize::depythonize::<serde_json::Value>(template)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid template: {}", e)))?;

    let inputs_json = pythonize::depythonize::<serde_json::Value>(inputs)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Invalid inputs: {}", e)))?;

    // Deserialize to Rust structs
    let template: Template = serde_json::from_value(template_json)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Failed to parse template: {}", e)))?;

    let inputs: Vec<Input> = serde_json::from_value(inputs_json)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyValueError, _>(format!("Failed to parse inputs: {}", e)))?;

    // Generate PDF
    generate_pdf_internal(template, inputs)
        .map_err(|e| PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(e.to_string()))
}

fn generate_pdf_internal(template: Template, inputs: Vec<Input>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use printpdf::*;

    let width_mm = Mm(template.base_pdf.width);
    let height_mm = Mm(template.base_pdf.height);

    let (mut doc, page1, layer1) = PdfDocument::new(
        "PDFme Generated",
        width_mm,
        height_mm,
        "Layer 1"
    );

    for (input_idx, input) in inputs.iter().enumerate() {
        let current_page = if input_idx == 0 {
            page1
        } else {
            doc.add_page(width_mm, height_mm, "Layer 1").0
        };

        let current_layer = doc.get_page(current_page).get_layer(layer1);

        for page_schemas in &template.schemas {
            for schema in page_schemas {
                render_schema(&current_layer, schema, input, &template)?;
            }
        }
    }

    let mut buffer = Vec::new();
    doc.save(&mut buffer)?;

    Ok(buffer)
}

fn render_schema(
    layer: &PdfLayerReference,
    schema: &Schema,
    input: &Input,
    template: &Template,
) -> Result<(), Box<dyn std::error::Error>> {
    use printpdf::*;

    match schema.schema_type.as_str() {
        "text" => {
            let text = input.fields.get(&schema.name)
                .or(schema.content.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("");

            let font = layer.get_builtin_font(BuiltinFont::Helvetica)?;

            let x = Mm(schema.position.x);
            let y = Mm(template.base_pdf.height - schema.position.y - schema.height);

            layer.use_text(text, 12.0, x, y, &font);
        }
        _ => {
            eprintln!("Unsupported schema type: {}", schema.schema_type);
        }
    }

    Ok(())
}

/// PDFme Python module
#[pymodule]
fn pdfme(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(generate, m)?)?;
    Ok(())
}
