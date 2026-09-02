# FormSchema — the only contract

Everything hinges on this one object. The backend produces it, the frontend renders from it, the AI is prompted with it. Get it right in Phase 1 and the rest follows.

```json
{
  "form_id": "f_a1b2c3",
  "filename": "i-129.pdf",
  "page_count": 38,
  "pages": [{ "number": 1, "width": 612, "height": 792, "image": "page-1.png" }],
  "fields": [
    {
      "field_id": "fld_0007",
      "raw_name": "form1[0].Page1[0].Line2_CompanyName[0]",
      "label": "Company or Organization Name",
      "tooltip": "Provide the full legal name of the company or organization petitioning.",
      "type": "text",
      "page": 1,
      "bbox": [0.068, 0.412, 0.932, 0.437],
      "options": null,
      "on_state": null,
      "max_len": 60,
      "required": false,
      "read_only": false
    }
  ]
}
```

Three rules about this object, all of which prevent bugs you would otherwise spend an evening on:

**`bbox` is normalised and top-left origin.** Four floats between 0 and 1, as a fraction of page width and height, with `y` measured **down** from the top. PDF stores rectangles bottom-left, so the backend flips them once, at parse time. The frontend then never does coordinate maths — it multiplies by the rendered canvas size and stops. If you ever find yourself flipping a y-axis in React, the bug is in Python.

**`type` is one of** `text`, `multiline_text`, `checkbox`, `radio`, `dropdown`, `listbox`, `signature`. Nothing else.

**`label` and `tooltip` are separate.** The tooltip is the form author's own description (`/TU` in the PDF) and it is gold — the screenshot you sent shows exactly this: *"Provide the full legal name of the company or organization petitioning."* The label is the short name. The UI shows both on hover; the AI gets both.
