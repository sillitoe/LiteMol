/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */


namespace LiteMol.Bootstrap.Behaviour.Density {
    "use strict";
        
    export interface ShowElectronDensityAroundSelectionParams {        
        style: Visualization.Density.Style,
        radius: number, 
        defaultTarget?: { bottomLeft: number[], topRight: number[] }
    }
    
    export class ShowElectronDensityAroundSelection implements Dynamic {
        
        private obs: Rx.IDisposable[] = [];
        private behaviour: Entity.Density.InteractiveSurface;
        private ref = Utils.generateUUID();
        private isBusy = false;
        
        private remove() {
            let v = this.getVisual();
            if (v) {
                Tree.remove(v);
            }
        }
        
        private getVisual() {
            return this.context.select(this.ref)[0] as Entity.Density.Visual;
        }
           
        private update(info: Interactivity.Info ) {            
            if (!Interactivity.Molecule.isMoleculeModelInteractivity(info)) {
                this.remove();
                return;
            }
            
            let model = Utils.Molecule.findModel(info.entity!)!;
            let center = {x:0, y:0, z:0};
            let elems = info.elements;
            let m = model.props.model;
            if (info.elements!.length === 1) {
                elems = Utils.Molecule.getResidueIndices(m, info.elements![0]);
            }                         
            let box = Utils.Molecule.getBox(m, elems!, this.params.radius);   
            
            let style = Utils.shallowClone(this.params.style);
            style.params = Utils.shallowClone(style.params);
            style.params!.bottomLeft = box.bottomLeft;
            style.params!.topRight = box.topRight;
            style.computeOnBackground = true;
            
            let task: Task<any>;
            
            let visual = this.getVisual();       
            if (!visual) {
                let t = Entity.Transformer.Density.CreateVisual.create({ style }, { ref: this.ref, isHidden: true });
                t.isUpdate = true;
                task = t.apply(this.context, <any>this.behaviour)
            }
            else task = Entity.Transformer.Density.CreateVisual.create({ style }, { ref: this.ref, isHidden: true }).update(this.context, visual);
            
            //this.isBusy = true;
            task.run(this.context);   
        }
        
        dispose() {
            this.remove();
            for (let o of this.obs) o.dispose();
            this.obs = [];
        }
        
        register(behaviour: Entity.Density.InteractiveSurface) {
            this.behaviour = behaviour;
            this.obs.push(this.context.behaviours.select.subscribe(e => {
                this.update(e)
            }));
        }
                
        constructor(public context: Context, public params: ShowElectronDensityAroundSelectionParams) {            
        }
    }
    
    
    
}