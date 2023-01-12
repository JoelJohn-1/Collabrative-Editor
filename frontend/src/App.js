import "./App.css";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Editor from './components/Editor.js'
import Login from './components/Login.js'
import Register from './components/Register.js'
import Home from './components/Home.js'

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Login />} />
				<Route path="/register" element={<Register />} />
                <Route path="/edit/:id" element={<Editor />} />
				<Route path="/home" element={<Home />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
