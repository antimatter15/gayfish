// this is the webworker

var __latestCellID;
function __track$loop__(i, total){
	postMessage({ type: 'progress', frac: i / total, cell: __latestCellID })
}

onmessage = function(e) {
	var packet = e.data;
	console.log(packet)
	if(packet.type == 'exec'){
		__latestCellID = packet.cell;

		try{
			var result = eval.call(self, packet.code)
			postMessage({ type: 'result', result: result, cell: packet.cell })
		} catch (err) {
			postMessage({ type: 'error', error: err.toString(), cell: packet.cell })
		}
		
	}
}