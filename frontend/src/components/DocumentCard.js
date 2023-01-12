import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function DocumentCard(props) {
    const api = axios.create({ withCredentials: true, baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/collection" });
    const { name, id } = props;
    let navigate = useNavigate();

    async function handleEdit() {
        navigate(`/edit/${id}`)
    }

    async function handleDelete() {
        await api.post("/delete", {
            id: id
        });
    }

	return (
            <div>
                <span> {name} </span>
                <button onClick={handleEdit}> Edit </button>
                <button onClick={handleDelete}> Delete </button>
            </div>
            );
}

export default DocumentCard;
