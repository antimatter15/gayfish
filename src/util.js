export function array_join(array, glue){
    var new_array = []
    for(var i = 0; i < array.length; i++){
        new_array.push(array[i])
        if(i != array.length - 1) new_array.push(glue);
    }
    return new_array
}
