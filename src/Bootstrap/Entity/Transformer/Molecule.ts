/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */


namespace LiteMol.Bootstrap.Entity.Transformer.Molecule {
    "use strict";

    //export interface ParseCifParams { blockIndex: number }

    export interface DownloadMoleculeSourceParams { id?: string, format?: Core.Formats.FormatInfo }
    export function downloadMoleculeSource(params: { sourceId: string, name: string, description: string, urlTemplate: (id: string) => string, defaultId: string, specificFormat?: Core.Formats.FormatInfo, isFullUrl?: boolean }) {
        return Tree.Transformer.action<Root, Action, DownloadMoleculeSourceParams>({
            id: 'molecule-download-molecule-' + params.sourceId,
            name: 'Molecule from ' + params.name,
            description: params.description,
            from: [Root],
            to: [Action],
            defaultParams: ctx => ({ id: params.defaultId, format: LiteMol.Core.Formats.Molecule.SupportedFormats.mmCIF }),
            validateParams: p => (!p.id || !p.id.trim().length) ? [`Enter ${params.isFullUrl ? 'URL' : 'Id'}`] : void 0
        }, (context, a, t) => {
            let format = params.specificFormat ? params.specificFormat : t.params.format!;
            return Tree.Transform.build()
                .add(a, <Tree.Transformer.To<Entity.Data.String | Entity.Data.Binary>>Data.Download, { url: params.urlTemplate(t.params.id!.trim()), type: format.isBinary ? 'Binary' : 'String', id: t.params.id, description: params.name })
                .then(CreateFromData, { format: params.specificFormat ? params.specificFormat : t.params.format }, { isBinding: true })
                .then(Molecule.CreateModel, { modelIndex: 0 }, { isBinding: false })
        })
    }

    export interface OpenMoleculeFromFileParams { file?: File }
    export const OpenMoleculeFromFile = Tree.Transformer.action<Root, Action, OpenMoleculeFromFileParams>({
        id: 'molecule-open-from-file',
        name: 'Molecule from File',
        description: `Open a molecule from a file (${LiteMol.Core.Formats.Molecule.SupportedFormats.All.map(f => f.name).join(', ')}).`,
        from: [Root],
        to: [Action],
        defaultParams: ctx => ({ format: LiteMol.Core.Formats.Molecule.SupportedFormats.mmCIF }),
        validateParams: p => !p.file ? ['Select a file'] : !LiteMol.Core.Formats.FormatInfo.getFormat(p.file.name, LiteMol.Core.Formats.Molecule.SupportedFormats.All)
            ? [`Select a supported file format (${(<any[]>[]).concat(LiteMol.Core.Formats.Molecule.SupportedFormats.All.map(f => f.extensions)).join(', ')}).`]
            : void 0
    }, (context, a, t) => {
        let format = LiteMol.Core.Formats.FormatInfo.getFormat(t.params.file!.name, LiteMol.Core.Formats.Molecule.SupportedFormats.All) !;
        return Tree.Transform.build()
            .add(a, <Tree.Transformer.To<Entity.Data.String | Entity.Data.Binary>>Data.OpenFile, { file: t.params.file, type: format.isBinary ? 'Binary' : 'String' })
            .then(CreateFromData, { format }, { isBinding: true })
            .then(Molecule.CreateModel, { modelIndex: 0 }, { isBinding: false })
    })

    export interface CreateFromDataParams {
        format?: Core.Formats.FormatInfo,
        customId?: string
    }

    export const CreateFromData = Tree.Transformer.create<Entity.Data.String | Entity.Data.Binary, Entity.Molecule.Molecule, CreateFromDataParams>({
        id: 'molecule-create-from-data',
        name: 'Molecule',
        description: 'Create a molecule from string or binary data.',
        from: [Entity.Data.String, Entity.Data.Binary],
        to: [Entity.Molecule.Molecule],
        defaultParams: (ctx) => ({ format: LiteMol.Core.Formats.Molecule.SupportedFormats.mmCIF })
    }, (ctx, a, t) => {

        return Task.fromComputation(`Create Molecule (${a.props.label})`, 'Normal', t.params.format!.parse(a.props.data, { id: t.params.customId }))
            .setReportTime(true)
            .bind(`Create Molecule (${a.props.label})`, 'Silent', r => {
                if (r.isError) return Task.reject(`Create Molecule (${a.props.label})`, 'Background', r.toString());
                if (r.warnings && r.warnings.length > 0) {
                    for (let w of r.warnings) {
                        ctx.logger.warning(w);
                    }
                }
                let e = Entity.Molecule.Molecule.create(t, { label: r.result.id, molecule: r.result });
                return Task.resolve(`Create Molecule (${a.props.label})`, 'Background', e);
            });
    }
    );

    export interface CreateFromMmCifParams {
        blockIndex?: number
    }

    export const CreateFromMmCif = Tree.Transformer.create<Entity.Data.CifDictionary, Entity.Molecule.Molecule, CreateFromMmCifParams>({
        id: 'molecule-create-from-mmcif',
        name: 'Molecule',
        description: 'Create a molecule from a mmCIF data block.',
        from: [Entity.Data.CifDictionary],
        to: [Entity.Molecule.Molecule],
        defaultParams: (ctx) => ({ blockIndex: 0 })
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Molecule>(`Create Molecule (${a.props.label})`, 'Normal', ctx => {
            ctx.update('Creating...');
            let index = t.params.blockIndex | 0;
            let b = a.props.dictionary.dataBlocks[index];
            if (!b) {
                ctx.reject(`The source contains only ${a.props.dictionary.dataBlocks.length} data block(s), tried to access the ${index + 1}-th.`);
                return;
            }
            ctx.schedule(() => {
                let molecule = LiteMol.Core.Formats.Molecule.mmCIF.ofDataBlock(b);
                ctx.resolve(Entity.Molecule.Molecule.create(t, { label: molecule.id, molecule }));
            });
        }).setReportTime(true);
    }
    );

    export interface CreateModelParams {
        modelIndex?: number
    }

    export const CreateModel = Tree.Transformer.create<Entity.Molecule.Molecule, Entity.Molecule.Model, CreateModelParams>({
        id: 'molecule-create-model',
        name: 'Model',
        description: 'Create a model of a molecule.',
        from: [Entity.Molecule.Molecule],
        to: [Entity.Molecule.Model],
        isUpdatable: true,
        defaultParams: ctx => ({ modelIndex: 0 })
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Model>(`Create Model (${a.props.label})`, 'Background', ctx => {
            let params = t.params;
            let index = params.modelIndex | 0;
            let model = a.props.molecule.models[index];
            if (!model) {
                ctx.reject(`The molecule contains only ${a.props.molecule.models.length} model(s), tried to access the ${index + 1}-th.`);
                return;
            }
            ctx.resolve(Entity.Molecule.Model.create(t, {
                label: 'Model ' + model.modelId,
                description: `${model.atoms.count} atom${model.atoms.count !== 1 ? 's' : ''}`,
                model
            }));
        });
    }
    );

    export interface CreateSelectionParams {
        name?: string,
        queryString?: string,
        silent?: boolean,
        inFullContext?: boolean
    }

    export const CreateSelection = Tree.Transformer.create<Entity.Molecule.Model | Entity.Molecule.Visual, Entity.Molecule.Selection, CreateSelectionParams>({
        id: 'molecule-create-selection',
        name: 'Selection',
        description: 'Create an atom selection.',
        from: [Entity.Molecule.Model, Entity.Molecule.Visual],
        to: [Entity.Molecule.Selection],
        isUpdatable: true,
        defaultParams: ctx => ({ queryString: ctx.settings.get('molecule.model.defaultQuery') || '' }),
        validateParams: p => {
            if (!(p.queryString || '').trim().length) return ['Enter query'];
            try {
                let q = Core.Structure.Query.Builder.toQuery(p.queryString!);
                return void 0;
            } catch (e) {
                return ['' + e];
            }
        },
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Selection>(`Create Selection (${a.props.label})`, 'Background', ctx => {
            let params = t.params;
            let query = Core.Structure.Query.Builder.toQuery(params.queryString!);
            let queryCtx = t.params.inFullContext ? Utils.Molecule.findModel(a) !.props.model.queryContext : Utils.Molecule.findQueryContext(a);
            let indices = query(queryCtx).unionAtomIndices();
            if (!indices.length) {
                ctx.reject({ warn: true, message: `Empty selection${t.params.name ? ' (' + t.params.name + ')' : ''}.` });
                return;
            }
            ctx.resolve(Entity.Molecule.Selection.create(t, { label: params.name ? params.name : 'Selection', description: `${indices.length} atom${indices.length !== 1 ? 's' : ''}`, indices }));
        }).setReportTime(!t.params.silent);
    }
    );

    export interface CreateSelectionFromQueryParams {
        query?: Core.Structure.Query.Source,
        name?: string,
        silent?: boolean,
        inFullContext?: boolean
    }

    export const CreateSelectionFromQuery = Tree.Transformer.create<Entity.Molecule.Model | Entity.Molecule.Visual, Entity.Molecule.Selection, CreateSelectionFromQueryParams>({
        id: 'molecule-create-selection',
        name: 'Selection',
        description: 'Create an atom selection.',
        from: [Entity.Molecule.Model, Entity.Molecule.Visual],
        to: [Entity.Molecule.Selection],
        defaultParams: ctx => ({}),
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Selection>(`Create Selection (${a.props.label})`, 'Background', ctx => {
            let params = t.params;
            let query = Core.Structure.Query.Builder.toQuery(params.query!);
            let queryCtx = t.params.inFullContext ? Utils.Molecule.findModel(a) !.props.model.queryContext : Utils.Molecule.findQueryContext(a);
            let indices = query(queryCtx).unionAtomIndices();
            if (!indices.length) {
                ctx.reject({ warn: true, message: `Empty selection${t.params.name ? ' (' + t.params.name + ')' : ''}.` });
                return;
            }
            ctx.resolve(Entity.Molecule.Selection.create(t, { label: params.name ? params.name : 'Selection', description: `${indices.length} atom${indices.length !== 1 ? 's' : ''}`, indices }));
        }).setReportTime(!t.params.silent);
    }
    );

    export interface CreateAssemblyParams {
        name?: string
    }

    export const CreateAssembly = Tree.Transformer.create<Entity.Molecule.Model, Entity.Molecule.Model, CreateAssemblyParams>({
        id: 'molecule-create-assemly',
        name: 'Assembly',
        description: 'Create an assembly of a molecule.',
        from: [Entity.Molecule.Model],
        to: [Entity.Molecule.Model],
        defaultParams: (ctx, e) => {
            let m = Utils.Molecule.findModel(e) !;
            let ret = ({ name: ctx.settings.get('molecule.model.defaultAssemblyName') || '1' });
            let asm = m.props.model.assemblyInfo;
            if (!asm || !asm.assemblies.length) return ret;
            if (asm.assemblies.filter(a => a.name === ret.name)) return ret;
            ret.name = asm.assemblies[0].name;
            return ret;
        },
        isUpdatable: true,
        isApplicable: m => !!(m && m.props.model.assemblyInfo && m.props.model.assemblyInfo.assemblies.length)
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Model>(`Create Model (${a.props.label})`, 'Background', ctx => {
            let i = a.props.model.assemblyInfo;
            if (!i || !i.assemblies.length) {
                ctx.reject('Assembly info not available.');
                return;
            }
            let gen = i.assemblies.filter(a => a.name === t.params.name)[0];
            if (!gen) {
                ctx.reject(`No assembly called '${t.params.name}' found.`);
                return;
            }
            ctx.update('Creating...');
            ctx.schedule(() => {
                let asm = Core.Structure.buildAssembly(a.props.model, gen);
                ctx.resolve(Entity.Molecule.Model.create(t, {
                    label: 'Assembly ' + gen.name,
                    description: `${asm.atoms.count} atom${asm.atoms.count !== 1 ? 's' : ''}`,
                    model: asm
                }));
            });
        });
    }
    );

    export interface CreateSymmetryMatesParams {
        type?: 'Mates' | 'Interaction',
        radius?: number
    }

    export const CreateSymmetryMates = Tree.Transformer.create<Entity.Molecule.Model, Entity.Molecule.Model, CreateSymmetryMatesParams>({
        id: 'molecule-create-symmetry-mates',
        name: 'Crystal Symmetry',
        description: 'Find crystal symmetry mates or interaction partners.',
        from: [Entity.Molecule.Model],
        to: [Entity.Molecule.Model],
        defaultParams: ctx => ({ type: 'Interaction', radius: 5.0 }),
        isUpdatable: true,
        isApplicable: m => !!(m && m.props.model.symmetryInfo)
    }, (ctx, a, t) => {
        return Task.create<Entity.Molecule.Model>(`Create Model (${a.props.label})`, 'Background', ctx => {
            let i = a.props.model.symmetryInfo;
            if (!i) {
                ctx.reject('Spacegroup info info not available.');
                return;
            }
            let radius = Math.max(t.params.radius!, 0);
            ctx.update('Creating...');
            ctx.schedule(() => {
                let symm = t.params.type === 'Mates' ? Core.Structure.buildSymmetryMates(a.props.model, radius) : Core.Structure.buildPivotGroupSymmetry(a.props.model, radius);
                ctx.resolve(Entity.Molecule.Model.create(t, {
                    label: 'Symmetry',
                    model: symm,
                    description: `${symm.atoms.count} atom${symm.atoms.count !== 1 ? 's' : ''}, ${t.params.type} ${Utils.round(radius, 1)} \u212B`
                }));
            });
        });
    }
    );

    export interface CreateVisualParams {
        style?: Visualization.Molecule.Style<any>
    }

    export const CreateVisual = Tree.Transformer.create<Entity.Molecule.Model | Entity.Molecule.Selection, Entity.Molecule.Visual, CreateVisualParams>({
        id: 'molecule-create-visual',
        name: 'Visual',
        description: 'Create a visual of a molecule or a selection.',
        from: [Entity.Molecule.Model, Entity.Molecule.Selection],
        to: [Entity.Molecule.Visual],
        isUpdatable: true,
        defaultParams: ctx => ({ style: Visualization.Molecule.Default.ForType.get('Cartoons') }),
        validateParams: p => !p.style ? ['Specify Style'] : void 0,
        customController: (ctx, t, e) => new Components.Transform.MoleculeVisual(ctx, t, e)
    }, (ctx, a, t) => {
        let params = t.params;
        return Visualization.Molecule.create(a, t, params.style!).setReportTime(!t.params.style!.computeOnBackground);
    }, (ctx, b, t) => {

        let oldParams = b.transform.params as CreateVisualParams;
        if (oldParams.style!.type !== t.params.style!.type || !Utils.deepEqual(oldParams.style!.params, t.params.style!.params)) return void 0;

        let model = b.props.model;
        if (!model) return void 0;
        let a = Utils.Molecule.findModel(b.parent);
        if (!a) return void 0;

        let ti = t.params.style!.theme!;
        let theme = ti.template!.provider(a, Visualization.Theme.getProps(ti!));
        model.applyTheme(theme);
        b.props.style = t.params.style!;
        //Entity.forceUpdate(b);
        Entity.nodeUpdated(b);
        return Task.resolve(t.transformer.info.name, 'Background', Tree.Node.Null);
    }
    );

    export interface CreateMacromoleculeVisualParams {
        groupRef?: string,
        polymer?: boolean,
        polymerRef?: string,
        het?: boolean,
        hetRef?: string,
        water?: boolean,
        waterRef?: string
    }

    export const CreateMacromoleculeVisual = Tree.Transformer.create<Entity.Molecule.Model, Entity.Action, CreateMacromoleculeVisualParams>({
        id: 'molecule-create-macromolecule-visual',
        name: 'Macromolecule Visual',
        description: 'Create a visual of a molecule that is split into polymer, HET, and water parts.',
        from: [Entity.Molecule.Model],
        to: [Entity.Action],
        validateParams: p => !p.polymer && !p.het && !p.water ? ['Select at least one component'] : void 0,
        defaultParams: ctx => ({ polymer: true, het: true, water: true }),
    }, (context, a, t) => {

        return Task.create<Entity.Action>('Macromolecule', 'Normal', ctx => {

            let g = Tree.Transform.build().add(a, Basic.CreateGroup, { label: 'Group', description: 'Macromolecule' }, { ref: t.params.groupRef });

            if (t.params.polymer) {
                let polymer = g.then(CreateSelectionFromQuery, { query: Core.Structure.Query.nonHetPolymer(), name: 'Polymer', silent: true }, { isBinding: true })
                polymer.then(<any>CreateVisual, { style: Visualization.Molecule.Default.ForType.get('Cartoons') }, { ref: t.params.polymerRef });
            }

            if (t.params.het) {
                let het = g.then(CreateSelectionFromQuery, { query: Core.Structure.Query.hetGroups(), name: 'HET', silent: true }, { isBinding: true })
                het.then(<any>CreateVisual, { style: Visualization.Molecule.Default.ForType.get('BallsAndSticks') }, { ref: t.params.hetRef });
            }

            if (t.params.water) {

                let style: Visualization.Molecule.Style<Visualization.Molecule.BallsAndSticksParams> = {
                    type: 'BallsAndSticks',
                    params: { useVDW: false, atomRadius: 0.23, bondRadius: 0.09, detail: 'Automatic' },
                    theme: { template: Visualization.Molecule.Default.ElementSymbolThemeTemplate, colors: Visualization.Molecule.Default.ElementSymbolThemeTemplate.colors, transparency: { alpha: 0.25 } }
                }

                let water = g.then(CreateSelectionFromQuery, { query: Core.Structure.Query.entities({ type: 'water' }), name: 'Water', silent: true }, { isBinding: true })
                water.then(<any>CreateVisual, { style }, { ref: t.params.waterRef });
            }

            Tree.Transform.apply(context, g).run(context)
                .then(r => ctx.resolve(Tree.Node.Null))
                .catch(ctx.reject);
        });
    });
}          