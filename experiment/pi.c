#include <math.h>
#include <stdio.h>
#define N 1000

int main(){
  int len = floor(10 * N/3) + 1;
  int A[len];

  for(int i = 0; i < len; ++i) {
    A[i] = 2;
  }

  int nines    = 0;
  int predigit = 0;

  for(int j = 1; j < N + 1; ++j) {        
    int q = 0;

    for(int i = len; i > 0; --i) {
      int x  = 10 * A[i-1] + q*i;
      A[i-1] = x % (2*i - 1);
      q = x / (2*i - 1);
    }

    A[0] = q%10;
    q    = q/10;

    if (9 == q) {
      ++nines;
    }
    else if (10 == q) {
      printf("%d", predigit + 1);

      for (int k = 0; k < nines; ++k) {
        printf("%d", 0);
      }
      predigit, nines = 0;
    }
    else {
      printf("%d", predigit);
      predigit = q;

      if (0 != nines) {    
        for (int k = 0; k < nines; ++k) {
          printf("%d", 9);
        }

        nines = 0;
      }
    }
  }
  printf("%d", predigit);  
}

