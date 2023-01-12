import { useEffect } from "react";
import { useParams } from "react-router-dom";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import axios from "axios";
import { fromUint8Array, toUint8Array } from "js-base64";
Quill.register("modules/cursors", QuillCursors);

function Editor() {
	const { id } = useParams();

	useEffect(() => {
		const api = axios.create({ withCredentials: true, baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/" });
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

		editor.on("selection-change", async function (range, oldRange, source) {
			if (range) {
				await api.post(`api/presence/${id}`, {
					index: range.index,
					length: range.length
				});
			} else {
				console.log("Cursor not in the editor");
			}
		});

		const source = new EventSource(
			"http://coolkids.cse356.compas.cs.stonybrook.edu/api/connect/" + id, { withCredentials: true }
		);

		source.addEventListener("sync", (message) => {
			let data = JSON.parse(message.data);
			Y.applyUpdate(ydoc, toUint8Array(data.update));
		});

		source.addEventListener("update", (message) => {
			let data = JSON.parse(message.data);

			if (data.id !== ydoc.clientID)
				Y.applyUpdate(ydoc, toUint8Array(data.update));
		});

		source.addEventListener("presence", async (message) => {
			let data = JSON.parse(message.data);
			let res = await api.get("users/loggedIn");
			if (res.data.id !== data.session_id) {
				console.log(data);
				cursors.createCursor(data.session_id, data.name, "blue");
				cursors.moveCursor(data.session_id, { index: data.cursor.index, length: data.cursor.length });
			}
		});

		ydoc.on("update", async (update) => {
			await api.post("api/op/" + id, {
				update: fromUint8Array(update),
				id: ydoc.clientID,
			});
		});
	});

	return <div id="Document"></div>;
}

export default Editor;