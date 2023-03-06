

const PORT = location.host == "localhost:8081" ? 3001 : 3002;
const URL = "http://localhost:" + PORT;

const lengthCitizen = 20;

const container = document.getElementById("container");

/*
 <div class="col-md-6 mb-4">
	
</div>
*/
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

				const percent = vote*100/lengthCitizen
                const card = document.createElement("div");
				card.className = "col-md-6 mb-4";

				card.innerHTML = `
				<div class="row shado-md p-2 m-0 rounded shadow-md bg-white">
					<div class="col-md-3">
							<img class="rounded-pill max-130 p-2" src="${img}" alt="">
					</div>
					<div class="col-md-9 align-self-center">
						<h4 class="mt-3 fs-5 mb-1 fw-bold">${name}</h4>
						<p class="fs-8 mb-2 fw-bold">Votes: ${vote}</p>
						<div class="progress">
							<div 
								class="progress-bar bg-danger" 
								style="width:${percent}%"
								ariaValuenow="${percent}"
								role="progressbar" 
								aria-label="Example with label" 
								aria-valuemin="0" 
								aria-valuemax="100"
							>${percent} %</div>
						</div>
					</div>
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