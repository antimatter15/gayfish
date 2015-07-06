if(!global.Worker){
	global.Worker = (function(){
		var workerList = [];
		function Worker(src){
			this._id = workerList.length;
			workerList.push(this)
		}
		Worker.prototype.postMessage = function(message){
			postMessage({
				type: 'workerception',
				action: 'postMessage',
				message: message,
				id: this._id
			})
		}
		Worker.prototype.terminate = function(){
			postMessage({
				type: 'workerception',
				action: 'terminate',
				message: message,
				id: this._id
			})
		}
		Worker.handleMessage = function(message){
			if(message.id in workerList){
				workerList[message.id].onmessage(message.event)
			}else{
				throw new Error("Message ID not found in worker list");
			}
		}
		return Worker;
	})();
}