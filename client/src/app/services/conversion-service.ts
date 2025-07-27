import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConversionService {

  constructor(private http: HttpClient) { }

  /**
   * Takes in a .ot file containing a map in the form of a color octree and 
   * converts relevant information to JSON format.
   * @param file File (with .ot extension) containing the color octree.
   * @returns A JSON containing the map's voxel data extracted from the 
   * provided file.
   */
  public octomap2json(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>('/api/convert', formData).pipe(
      catchError(error => {
        let errorMessage = `Conversion failed: ${error.status} ${error.statusText}`;
        if (error.error && typeof error.error === 'string') {
          errorMessage += ` - ${error.error}`;
        } else if (error.message) {
          errorMessage += ` - ${error.message}`;
        }
        console.error('Conversion Service Error:', errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

}
