import { useEffect, useState } from "react";
import axios from "axios";
import DocumentCard from "./DocumentCard.js"

function Home() {
	const api = axios.create({
		withCredentials: true,
		baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/",
	});

	const [loggedIn, setLoggedIn] = useState(false);
	const [documents, setDocuments] = useState(null);

	const getLoggedIn = () => {
		api.get("users/loggedIn").then((response) => {
			if (response.status === 200) {
				api.get("collection/list").then((response) => {
					setLoggedIn(true);
					setDocuments(
						response.data.map((doc) => {
							return <DocumentCard key={doc.id} name={doc.name} id={doc.id}></DocumentCard>;
						})
					);
				});
			} else setLoggedIn(false);
		});
	};

	async function handleSubmit(event) {
		event.preventDefault();
		const data = new FormData(event.target);

		await api.post("collection/create", {
			name: data.get("name")
		});
	}

	useEffect(() => {
		getLoggedIn();
	}, []);

	async function createDocument() {
		let name = document.getElementById("name").value;
		await api.post("collection/create", {
			name: name
		});
	}

	async function logout() {
		await api.post("users/logout");
	}

	if (!loggedIn) return <div>Not Logged In</div>;

	return (
			<div>
				<div id="form">
					<input id="name" type="text" name="name"></input>
					<button onClick={createDocument}>Create</button>
				</div>
				<div>
					{documents}
				</div>
				<div>
					<button onClick={logout}> Logout </button>
				</div>
			</div>
			);
}

export default Home;
