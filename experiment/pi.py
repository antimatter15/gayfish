def calcPi():
    q, r, t, k, n, l = 1, 0, 1, 1, 3, 3
    nr = 0
    nn = 0
    while True:
        print q, r, t, k, n, l, nr, nn
        if 4*q+r-t < n*t:
            yield n
            nr = 10*(r-n*t)
            n  = ((10*(3*q+r))//t)-10*n
            q  *= 10
            r  = nr
        else:
            nr = (2*q+r)*l
            nn = (q*(7*k)+2+(r*l))//(t*l)
            q  *= k
            t  *= l
            l  += 2
            k += 1
            n  = nn
            r  = nr

import sys
pi_digits = calcPi()
for i in range(50):
    print i, pi_digits.next()
# i = 0
# for d in pi_digits:
#     sys.stdout.write(str(d))
#     i += 1
#     if i == 40: print(""); i = 0