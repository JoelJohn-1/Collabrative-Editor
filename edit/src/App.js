import "./App.css";
import { useEffect } from "react";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import axios from "axios";
import { fromUint8Array, toUint8Array } from "js-base64";
Quill.register("modules/cursors", QuillCursors);

function App() {
	useEffect(() => {
		const api = axios.create({
			withCredentials: true,
			baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/",
		});
		const ydoc = new Y.Doc();
		const ytext = ydoc.getText("quill");

		const editorContainer = document.getElementById("Document");
		const editor = new Quill(editorContainer, {
			modules: {
				cursors: true,
				toolbar: [["bold", "italic", "underline"], ["image"]],
				history: {
					userOnly: true,
				},
			},
			placeholder: "Start collaborating...",
			theme: "snow",
		});

		const binding = new QuillBinding(ytext, editor);

		const cursors = editor.getModule("cursors");
		cursors.createCursor("null", "null", "blue");

		let temp = window.location.href.split("/");
		let id = temp[temp.length - 1];

		editor.on("selection-change", async function (range, oldRange, source) {
			if (range) {
				await api.post(`api/presence/${id}`, {
					index: range.index,
					length: range.length,
				});
			} else {
				//console.log("Cursor not in the editor");
			}
		});

		const source = new EventSource(
			"http://coolkids.cse356.compas.cs.stonybrook.edu/api/connect/" + id,
			{ withCredentials: true }
		);

		source.addEventListener("sync", (message) => {
			let data = JSON.parse(message.data);

			//console.log("Sync");
			//console.log(data.update);

			Y.applyUpdate(ydoc, toUint8Array(data.update));
			//console.log(ydoc.getText("quill").toString());
		});

		source.addEventListener("update", (message) => {
			let data = JSON.parse(message.data);

			if (data.id !== ydoc.clientID) {
				//console.log("Apply update");

				Y.applyUpdate(ydoc, toUint8Array(data.update));
				//console.log(ytext.toString());
			}
		});

		source.addEventListener("presence", async (message) => {
			let data = JSON.parse(message.data);
			let res = await api.get("users/loggedIn");
			if (res.data.id !== data.session_id) {
				cursors.createCursor(data.session_id, data.name, "blue");
				cursors.moveCursor(data.session_id, {
					index: data.cursor.index,
					length: data.cursor.length,
				});
			}
		});

		ydoc.on("update", async (update) => {
			//console.log("Update")
			await api.post("api/op/" + id, {
				update: fromUint8Array(update),
				id: ydoc.clientID,
			});
		});
	});

	return <div id="Document"></div>;
}

export default App;
