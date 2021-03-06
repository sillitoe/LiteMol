/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace LiteMol.Core.Geometry {
    "use strict";
    
    export interface Surface {
        
        /**
         * Number of vertices.
         */
        vertexCount: number;
        
        /**
         * Number of triangles.
         */
        triangleCount: number;

        /**
         * Array of size 3 * vertexCount. Layout [x1, y1, z1, ...., xn, yn, zn]
         */
        vertices: Float32Array;

        /**
         * 3 indexes for each triangle
         */
        triangleIndices: Uint32Array;

        /**
         * Per vertex annotation.
         */
        annotation?: number[];

        /**
         * Array of size 3 * vertexCount. Layout [x1, y1, z1, ...., xn, yn, zn]
         *
         * Computed on demand.
         */
        normals?: Float32Array;
        
        /**
         * Bounding sphere.
         */
        boundingSphere?: { center: Geometry.LinearAlgebra.ObjectVec3, radius: number };
    }
    
    export namespace Surface {
     
        export function computeNormals(surface: Surface): Computation<Surface> {
            
            return Computation.create<Surface>(ctx => {
                if (surface.normals) {
                    ctx.resolve(surface);
                };                
                     
                ctx.update('Computing normals...'); 
                               
                ctx.schedule(() => {
                    let normals = new Float32Array(surface.vertices.length),
                        v = surface.vertices, triangles = surface.triangleIndices,
                        len = triangles.length,
                        f: number, i: number;
                    for (i = 0; i < triangles.length; i += 3) {
                        let a = 3 * triangles[i],
                            b = 3 * triangles[i + 1],
                            c = 3 * triangles[i + 2];
                            
                        let nx = v[a + 2] * (v[b + 1] - v[c + 1]) + v[b + 2] * v[c + 1] - v[b + 1] * v[c + 2] + v[a + 1] * (-v[b + 2] + v[c + 2]),
                            ny = -(v[b + 2] * v[c]) + v[a + 2] * (-v[b] + v[c]) + v[a] * (v[b + 2] - v[c + 2]) + v[b] * v[c + 2],
                            nz = v[a + 1] * (v[b] - v[c]) + v[b + 1] * v[c] - v[b] * v[c + 1] + v[a] * (-v[b + 1] + v[b + 1]);

                        normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
                        normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
                        normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
                    }

                    for (i = 0; i < normals.length; i += 3) {
                        let nx = normals[i]; 
                        let ny = normals[i + 1]; 
                        let nz = normals[i + 2];
                        f = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
                        normals[i] *= f; normals[i + 1] *= f; normals[i + 2] *= f;
                    }
                    surface.normals = normals;
                    
                    ctx.resolve(surface);    
                });
            });        
        }
        
        
        function addVertex(src: Float32Array, i: number, dst: Float32Array, j: number) {
            dst[3 * j] += src[3 * i];
            dst[3 * j + 1] += src[3 * i + 1];
            dst[3 * j + 2] += src[3 * i + 2];
        }

        function laplacianSmoothIter(surface: Surface, counts: Int32Array, vs: Float32Array) {

            let triCount = surface.triangleIndices.length,
                src = surface.vertices;
            
            let triangleIndices = surface.triangleIndices;    
            
            for (let i = 0; i < triCount; i += 3) {
                let a = triangleIndices[i],
                    b = triangleIndices[i + 1],
                    c = triangleIndices[i + 2];

                addVertex(src, b, vs, a);
                addVertex(src, c, vs, a);

                addVertex(src, a, vs, b);
                addVertex(src, c, vs, b);

                addVertex(src, a, vs, c);
                addVertex(src, b, vs, c);
            }

            for (let i = 0, _b = surface.vertexCount; i < _b; i++) {
                let n = counts[i] + 2;                
                vs[3 * i] = (vs[3 * i] + 2 * src[3 * i]) / n;
                vs[3 * i + 1] = (vs[3 * i + 1] + 2 * src[3 * i + 1]) / n;
                vs[3 * i + 2] = (vs[3 * i + 2] + 2 * src[3 * i + 2]) / n;
            }
        }

        /*
         * Smooths the vertices by averaging the neighborhood.
         *
         * Resets normals. Might replace vertex array.
         */
        export function laplacianSmooth(surface: Surface, iterCount: number = 1): Computation<Surface> {
            
            if (iterCount < 1) iterCount = 0;            
            if (iterCount === 0) return Computation.resolve(surface);
            
            return Computation.create<Surface>(ctx => {                
                ctx.update('Smoothing surface...');
                
                let counts = new Int32Array(surface.vertexCount),
                    triCount = surface.triangleIndices.length;
                
                let tris = surface.triangleIndices;
                for (let i = 0; i < triCount; i++) {
                    counts[tris[i]] += 2;
                }
                
                let vs = new Float32Array(surface.vertices.length);
                
                let next = (i: number) => {
                    if (i >= iterCount) {
                        ctx.resolve(surface);
                        return;
                    }
                                        
                    if (i > 0) {
                        for (let j = 0, _b = vs.length; j < _b; j++) vs[j] = 0;
                    }
                    surface.normals = void 0;
                    laplacianSmoothIter(surface, counts, vs);
                    let t = surface.vertices;
                    surface.vertices = <any>vs;
                    vs = <any>t;
                    
                    ctx.update('Smoothing surface...', ctx.abortRequest, i + 1, iterCount);
                    ctx.schedule(() => next(i + 1));          
                }                            
                next(0);
            });
        }
        
        export function computeBoundingSphere(surface: Surface): Computation<Surface> {
            
            return Computation.create<Surface>(ctx => {
                if (surface.boundingSphere) {
                    ctx.resolve(surface);
                    return;
                }                
                ctx.update('Computing bounding sphere...');                
                ctx.schedule(() => {      
                    let vertices = surface.vertices;          
                    let x = 0, y = 0, z = 0;
                    for (let i = 0, _c = surface.vertices.length; i < _c; i += 3) {
                        x += vertices[i];
                        y += vertices[i + 1];
                        z += vertices[i + 2];
                    }
                    x /= surface.vertexCount;
                    y /= surface.vertexCount;
                    z /= surface.vertexCount;
                    let r = 0;
                    for (let i = 0, _c = vertices.length; i < _c; i += 3) {
                        let dx = x - vertices[i];
                        let dy = y - vertices[i + 1];
                        let dz = z - vertices[i + 2];
                        r = Math.max(r, dx * dx + dy * dy + dz * dz);
                    }
                    surface.boundingSphere = {
                        center: {x, y, z},
                        radius: Math.sqrt(r)
                    }
                    ctx.resolve(surface);
                });
            });
        }
        
        export function transform(surface: Surface, t: number[]): Computation<Surface> {
            
            return Computation.create<Surface>(ctx => {
                ctx.update('Updating surface...');                
                ctx.schedule(() => {
                    let p = { x: 0.1, y: 0.1, z: 0.1 }                    
                    let m = LinearAlgebra.Matrix4.transformVector3;
                    let vertices = surface.vertices;
                    for (let i = 0, _c = surface.vertices.length; i < _c; i += 3) {
                        p.x = vertices[i];
                        p.y = vertices[i + 1];
                        p.z = vertices[i + 2];
                        m(p, p, t);
                        vertices[i] = p.x;
                        vertices[i + 1] = p.y;
                        vertices[i + 2] = p.z;
                    }                    
                    surface.normals = void 0;
                    surface.boundingSphere = void 0;
                    ctx.resolve(surface);
                });
            });
        }
           
    }
}