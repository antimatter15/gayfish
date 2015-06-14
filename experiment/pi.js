function* calculatePi(){
    "use strict";
    let q = 1,
        r = 0,
        t = 1,
        k = 1,
        n = 3,
        l = 3;
    let nr, nn;
    while(true){
        console.log(q, r, t, k, n, l)
        if(4 * q + r - t < n * t){
            yield n
            nr = 10 * (r - n * t)
            n = (((10 *(3 * q + r)) / t) | 0) - 10 * n
            q *= 10
            r = nr
        }else{
            nr = (2*q+r)*l
            nn = ((q*(7*k)+2+(r*l))/(t*l)) | 0
            q  *= k
            t  *= l
            l  += 2
            k += 1
            n  = nn
            r  = nr
        }
    }
}

var it = calculatePi();
for(var i = 0; i < 100; i++){
    console.log(i, it.next().value)   
}
// console.log(it.next().value)
// console.log(it.next().value)