import { useEffect } from "react";
import axios from "axios";

function Register() {
    const api = axios.create({ withCredentials: true, baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/users" });

    async function handleRegister() {
        let res = await api.post("/signup", {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        });

        console.log(res)
    }

	return (
            <div>
                <div> Register </div>
                <div> Name <input id="name" type="text"></input></div>
                <div> Email <input id="email" type="text"></input></div>
                <div> Password <input id="password" type="text"></input></div>
                <button onClick={handleRegister}> Submit </button>
            </div>
            );
}

export default Register;
