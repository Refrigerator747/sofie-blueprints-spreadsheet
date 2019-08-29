import * as _ from 'underscore'
import * as objectPath from 'object-path'
import { SegmentConf, Piece, PieceParams, ObjectType } from '../types/classes'
import { IngestSegment, IBlueprintSegment, BlueprintResultPart, IBlueprintPiece, IBlueprintAdLibPiece, SegmentContext, BlueprintResultSegment } from 'tv-automation-sofie-blueprints-integration'
import { VMixTransitionType } from 'timeline-state-resolver-types'
import { isAdLibPiece } from '../common/util'
import { createGeneric, createPart } from './helpers/parts'
import { CreatePieceScript } from './helpers/pieces'
import { Attributes } from './helpers/sources'
import { CreatePieceVideo, CreatePieceCam, CreatePieceGraphicOverlay, CreatePieceGraphic } from './helpers/vmix/pieces'

export function getSegmentVMix (context: SegmentContext, ingestSegment: IngestSegment, config: SegmentConf, segment: IBlueprintSegment, parts: BlueprintResultPart[]): BlueprintResultSegment {
	if (!config.config.studio.VMixMediaDirectory) {
		context.warning(`The blueprint setting 'VMix Media Directory' must be set for VMix workflows`)
		return {
			segment,
			parts
		}
	}

	for (const part of ingestSegment.parts) {
		if (!part.payload) {
			context.warning(`Missing payload for part: '${part.name || part.externalId}'`)
		} else if (part.payload['float']) {
			continue
		} else {
			const type = objectPath.get(part.payload, 'type', '') + ''
			if (!type) {
				context.warning(`Missing type for part: '${part.name || part.externalId}'`)
				parts.push(createGeneric(part))
			} else {
				let pieces: IBlueprintPiece[] = []
				let adLibPieces: IBlueprintAdLibPiece[] = []
				if ('pieces' in part.payload) {
					let pieceList = part.payload['pieces'] as Piece[]

					// Generate script
					let script = ''
					if ('script' in part.payload) {
						script += part.payload['script']
					}
					pieceList.forEach(piece => {
						if (piece.script) {
							script += `\n${piece.script}`
						}
					})

					if (type.match(/dve/i)) {
						continue
					} else if (type.match(/breaker/i)) {
						continue
					} else {
						let transitionType = VMixTransitionType.Cut

						for (let i = 0; i < pieceList.length; i++) {
							if (pieceList[i].objectType.match(/transition/i)) {
								let pieceTransition = pieceList[i].transition
								if (pieceTransition) transitionType = transitionFromString(pieceTransition, VMixTransitionType.Cut)
							}
						}

						for (let i = 0; i < pieceList.length; i++) {
							let params: PieceParams = {
								config: config,
								piece: pieceList[i],
								context: type
							}

							switch (params.piece.objectType) {
								case ObjectType.VIDEO:
									if (params.piece.clipName) {
										createPieceByType(params, CreatePieceVideo, pieces, adLibPieces, transitionType)
									} else {
										context.warning(`Missing clip for video: ${params.piece.id}`)
									}
									break
								case ObjectType.CAMERA:
									if (params.piece.attributes[Attributes.CAMERA]) {
										createPieceByType(params, CreatePieceCam, pieces, adLibPieces, transitionType)
									} else {
										context.warning(`Missing camera for camera: ${params.piece.id}`)
									}
									break
								case ObjectType.GRAPHIC:
									if (params.piece.clipName) {
										createPieceByType(params, CreatePieceGraphic, pieces, adLibPieces, transitionType)
									} else {
										context.warning(`Missing clip for graphic: ${params.piece.id}`)
									}
									break
								case ObjectType.OVERLAY:
									if (params.piece.clipName) {
										createPieceByType(params, CreatePieceGraphicOverlay, pieces, adLibPieces, transitionType)
									} else {
										context.warning(`Missing clip for overlay: ${params.piece.id}`)
									}
									break
								case ObjectType.SCRIPT:
									break
								default:
									context.warning(`Missing objectType '${params.piece.objectType}' for piece: '${params.piece.clipName || params.piece.id}'`)
									break
							}

							if (i === 0 && script) {
								params.piece.script = script
								pieces.push(CreatePieceScript(params))
							}
						}
					}
				}

				parts.push(createPart(part, pieces, adLibPieces))
			}
		}
	}

	return {
		segment,
		parts
	}
}

/**
 * Returns the VMixTransitionType represented by a string.
 * If no match is found, Cut is returned.
 * @param {string} str Transtion style to match.
 */
function transitionFromString (str: string, defaultTransition: VMixTransitionType): VMixTransitionType {
	if (str.match(/crosszoom/i)) {
		return VMixTransitionType.CrossZoom
	} else if (str.match(/cube/i)) {
		return VMixTransitionType.Cube
	} else if (str.match(/cubezoom/i)) {
		return VMixTransitionType.CubeZoom
	} else if (str.match(/cut/i)) {
		return VMixTransitionType.Cut
	} else if (str.match(/fade/i)) {
		return VMixTransitionType.Fade
	} else if (str.match(/fly/i)) {
		return VMixTransitionType.Fly
	} else if (str.match(/flyrotate/i)) {
		return VMixTransitionType.FlyRotate
	} else if (str.match(/merge/i)) {
		return VMixTransitionType.Merge
	} else if (str.match(/slide/i)) {
		return VMixTransitionType.Slide
	} else if (str.match(/slidereverse/i)) {
		return VMixTransitionType.SlideReverse
	} else if (str.match(/verticalslide/i)) {
		return VMixTransitionType.VerticalSlide
	} else if (str.match(/verticalslidereverse/i)) {
		return VMixTransitionType.VerticalSlideReverse
	} else if (str.match(/verticalwipe/i)) {
		return VMixTransitionType.VerticalWipe
	} else if (str.match(/verticalwipereverse/i)) {
		return VMixTransitionType.VerticalWipeReverse
	} else if (str.match(/wipe/i)) {
		return VMixTransitionType.Wipe
	} else if (str.match(/wipereverse/i)) {
		return VMixTransitionType.WipeReverse
	} else if (str.match(/zoom/i)) {
		return VMixTransitionType.Zoom
	} else {
		return defaultTransition
	}
}

/**
 * Creates a piece using a given function.
 * @param {Piece} piece Piece to create.
 * @param {(config: SegmentConf, p: Piece, context: string, transition: AtemTransitionStyle) => IBlueprintPiece | IBlueprintAdLibPiece} creator Function for creating the piece.
 * @param {IBlueprintPiece[]} pieces Array of IBlueprintPiece to add regular pieces to.
 * @param {IBlueprintAdLibPiece[]} adLibPieces Array of IBlueprintAdLibPiece to add adLib pieces to.
 * @param {string} context The part type the piece belogs to e.g. 'HEAD'
 * @param {AtemTransitionsStyle} transitionType Type of transition to use.
 */
function createPieceByType (
	params: PieceParams,
	creator: (params: PieceParams, transition: VMixTransitionType) => IBlueprintPiece | IBlueprintAdLibPiece,
	pieces: IBlueprintPiece[],
	adLibPieces: IBlueprintAdLibPiece[],
	transitionType?: VMixTransitionType
) {
	let transition = transitionType
	if (params.piece.transition) transition = transitionFromString(params.piece.transition, transitionType || VMixTransitionType.Cut)

	let p = creator(params, transition || VMixTransitionType.Cut)
	if (p.content) {
		if (isAdLibPiece(p)) {
			adLibPieces.push(p as IBlueprintAdLibPiece)
		} else {
			pieces.push(p as IBlueprintPiece)
		}
	}
}
