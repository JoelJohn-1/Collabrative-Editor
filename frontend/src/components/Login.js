import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const api = axios.create({ withCredentials: true, baseURL: "http://coolkids.cse356.compas.cs.stonybrook.edu/users" });
    let navigate = useNavigate();

    async function handleLogin() {
        let res = await api.post("/login", {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        });

        console.log(res)
        if (res.data.name)
            navigate("/home")

    }

	return (
            <div>
                <div> Login </div>
                <div> Email <input id="email" type="text"></input></div>
                <div> Password <input id="password" type="text"></input></div>
                <button onClick={handleLogin}> Submit </button>
            </div>
            );
}

export default Login;
