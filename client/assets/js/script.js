

const PORT = location.host == "localhost:8081" ? 3001 : 3002;
const URL = "http://localhost:" + PORT;

const overlay = document.getElementById("overlay");
const container = document.getElementById("container");

async function getResult(){
	try {
        await fetch(URL).then(async res=>{
			const data = await res.json();
			console.log(data);
			for(const item of data){
            
				const id = item.ID;
				const vote = item.Vote;
                const name = item.Name;
                const img = item.Img;

                const card = document.createElement("div");
                card.className = "col-lg-4 col-md-6";
                card.innerHTML = `
                <div class="text-white text-center mb-4 votcard shadow-md bg-white p-4 pt-5">
                    <img class="rounded-pill shadow-md p-2" src="${img}">
                    <h4 class="mt-3 fs-5 mb-1 fw-bold">${name}</h4>
                    <h6 class="fs-7"></h6>
                    <button data-bs-toggle="modal" data-bs-target="#exampleModal" class="btn btn-primary fw-bolder fs-8">View Manifesto</button>
                    <button onclick="vote(${id})" class="btn btn-danger fw-bolder px-4 ms-2 fs-8">Vote</button>
                </div>
                `
                container.appendChild(card);
			}
        })
    }catch(e){
        console.log(e);
    }
}

getResult();

async function vote(id){
    overlay.style.display = "flex";
    try {
        await fetch(URL,{
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: id.toString()
            })
        }).then(res=>{
            alert("Vote success");
        })
    }catch(e){
        console.log(e);
    }
    overlay.style.display = "none";
}