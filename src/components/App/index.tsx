import React from "react";
import "./index.scss";
import Editor from "../Editor";
import EditorCtl from "../EditorCtl";
import { Template } from "../../types";
import { blankPdf } from "../../constants";

const devTemplate = {
  id: "",
  status: "public",
  owner: "",
  name: "",
  description: "",
  tags: [],
  photo: "",
  columns: ["field1", "field2"],
  sampledata: [
    {
      field1: "aa",
      field2: "aaaaaaaaaaaa",
    },
  ],
  fontName: "",
  createdAt: null,
  updatedAt: null,
  basePdf: blankPdf,
  schemas: [
    {
      field1: {
        type: "text",
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: "left",
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: "text",
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
        alignment: "left",
        fontSize: 20,
        characterSpacing: 0,
        lineHeight: 1,
      },
    },
  ],
} as Template;

const getForDevTemplate = (): Template => devTemplate;

function App() {
  return (
    <Editor
      lang="en"
      initTemplate={() => new Promise((r) => r(getForDevTemplate()))}
      saveTemplate={(arg) => {
        console.log(arg);
        return Promise.resolve();
      }}
      EditorCtl={EditorCtl}
    />
  );
}

export default App;
