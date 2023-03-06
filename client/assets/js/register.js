const PORT = location.host == "localhost:8081" ? 3001 : 3002;
const URL = "http://localhost:" + PORT;

const overlay = document.getElementById("overlay");

async function register(){
	overlay.style.display = "flex";

	const id = document.getElementById("inpId").value;
	const name = document.getElementById("inpName").value;
	const img = document.getElementById("inpImg").value;

	try {
        await fetch(URL + "/register",{
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id,
				name: name,
				img: img
            })
        }).then(res=>{
            alert("Register success");
			window.location = "/";
        })
    }catch(e){
        console.log(e);
    }

	overlay.style.display = "none";
}