define(
		function() {
      function PanelsController($scope, esFactory, ESService, ModalService, Notification) {
				angular.element(document).ready(function () {

					var generatorQueries = genES()
					var builderData = builderESDS()
					var bodybuilder = require('node_modules/bodybuilder/browser/bodybuilder.min')

	        ///////////////////////////VISUALIZACIONES CARGADAS///////////////////////////
	        //Me traigo las visualizaciones
					$scope.editingPanel = true;
	        var promise = genES.loadAllVis(ESService.client)
	        promise.then(function (resp) {
	          console.log("Cargadas: ", resp.hits.hits)
	          $scope.loadedvis = resp.hits.hits;
	        })


					$scope.createNewPanel = function(position, nchart, dimension, op){
						if($scope.actualPanel){
							$scope.actualPanel.remove()
						}
						$scope.actualPanel=dash.addPanel(position, nchart, dimension, op);
						console.log($scope.actualPanel)
						//dash.renderAll()

					}

					//////////////////////////////////////AÑADIR VIS A PANEL//////////////////////
					$scope.addToPanel = function(visall){
						console.log("A AÑADIR", visall);

						vis = visall._source;


						switch (vis.chartType) {
								case "pie":
										dash.pieChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).addCustomEvents(editVis).render();
										break
								case "bars":
										dash.barsChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).render();
										break;
								case "line":
										dash.lineChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).render();
										break;
								case "curve":
										dash.smoothCurveChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).render();
										break;
								case "3DBars":
										dash.TDbarsChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).gridsOn().render();
										break;
								case "bubbles":
										dash.bubbleChart($scope.actualPanel).data(vis.visobject._data).id(visall._id).gridsOn().render();
										break;
								default:
										console.log("Esta vacío")
										return

						}

					}
					/////////////////////////////////////////////////////////////////////////////

					//////////////////////////////////////EDITAR VIS DE PANEL//////////////////////
					var editVis = function(mesh) {
						dash.domEvents.bind(mesh, 'click', function(object3d){
							console.log("llamada a edicion de chart")
							//mesh.parentChart es el chart completo
							console.log("Objeto cargado", mesh.parentChart)
							idtosearch = mesh.parentChart._id
							//console.log(object3d)
							//console.log($scope)

							//Apply para que se apliquen los cambios al $scope
							$scope.$apply(function(){
								$scope.editingPanel = false;
								$scope.editingVis = true;

								var promise = generatorQueries.getVis(ESService.client, idtosearch);
								promise.then(function (resp) {
				          console.log("Visualiazcion a editar: ", resp.hits.hits[0])
									vis = resp.hits.hits[0]._source;
				        })

							})

						});
						console.log($scope.editingPanel)
					}
					/////////////////////////////////////////////////////////////////////////////


					///////////////////////////////////NEW PANEL////////////////////////////////////

					$scope.openNewPanelModal = function() {
						ModalService.showModal({
						    templateUrl: 'newpanelmodal.html',
								scope: $scope,
						    controller: function($scope, close) {

									 $scope.confirmCreate = function(result) {
									 	console.log("NEW PANEL TO CREATE", JSON.parse($scope.position), JSON.parse($scope.dimension))
										$scope.createNewPanel(JSON.parse($scope.position) ,4, JSON.parse($scope.dimension), $scope.opacity);
									 };

									 $scope.cancel = function(result) {
									 	console.log("cancel")
									 };
								}
						}).then(function(modal) {
						    modal.element.modal();
						    modal.close.then(function(result) {
						        console.log("modal cerrado")
						    });
						});
					};
					/////////////////////////////////////////////////////////////////////////////
					///////////////////////////////////SAVE VIS////////////////////////////////////

					$scope.openSavePanelModal = function() {

						if(!$scope.actualPanel){
							Notification.error("First build a panel")
							return
						}

							ModalService.showModal({
			            templateUrl: 'savepanelmodal.html',
									scope: $scope,
			            controller: function($scope, close) {

										 $scope.save = function(result) {
										 	console.log("Queremos guardar ---- ", $scope.name, $scope.description, $scope.$parent.actualPanel)


											//TODO: Cambiar filas y columnas por nueva versión de adrian
											var arrayChartsToSave = [];
											for (var i = 0; i < $scope.$parent.actualPanel.charts.length; i++) {
												var c = {
													row: 0,
													column: 0,
													id : $scope.$parent.actualPanel.charts[i]._id
												}
												arrayChartsToSave.push(c)
											}

											var positionPanel = "[" + $scope.$parent.actualPanel.coords.x + "," + $scope.$parent.actualPanel.coords.y + "," + $scope.$parent.actualPanel.coords.z + "]";


											var promiseCheck = generatorQueries.checkPanel(ESService.client, $scope.name)
											//ERROR GUARDANDO COMPROBAMOS SI EXISTE
											promiseCheck.then(function(response, error){
												if(error){
													Notification.error("ElasticSearch error")
												}

												//SI NO EXISTE SE CREA DE 0, SI NO HAY QUE PREGUNTAR SI QUIERE SOBREESCRIBIRSE
												if(response.hits.hits.length == 0){
													//Guardo
													var promise = generatorQueries.createPanel(ESService.client, $scope.name, $scope.description, positionPanel, "0", "0", "[500,500]", "0", arrayChartsToSave);
													promise.then(function(response, error){
														if(error){
															Notification.error("Error creating panel")
															return
														}
														Notification.success("Panel created")
													})
												}else{
													console.log("Modal of confirm");
													//MODAL DE CONFIRMACION
													ModalService.showModal({
									            templateUrl: 'updatepanelmodalconfirm.html',
															scope: $scope,
									            controller: function($scope, close) {

																 $scope.confirmUpdate = function(result) {
																 	console.log("Actualizar ---- ", $scope.name, $scope.description, $scope.$parent.actualPanel)
																	//Guardo
																	var promiseUpdate = generatorQueries.updatePanel(ESService.client, $scope.name, $scope.description, positionPanel, "0", "0", "[500,500]", "0", arrayChartsToSave);
																	promiseUpdate.then(function(response, error){
																		if(error){
																			Notification.error("Error updating panel")
																			return
																		}
																		Notification.success("Panel updated")
																	})
																 };

																 $scope.cancelUpdate = function(result) {
																 	console.log("cancel update")
																 };

															}
									        }).then(function(modal) {
									            modal.element.modal();
									            modal.close.then(function(result) {
									                console.log("modal cerrado")
									            });
									        });
													///////////////
												}
											})

										 };

										 $scope.cancel = function(result) {
										 	console.log("cancel")
										 };
										 ///////////////////////////////////////////////////////////////////////7
									}
			        }).then(function(modal) {
			            modal.element.modal();
			            modal.close.then(function(result) {
			                console.log("modal cerrado")
			            });
			        });
					};


					/////////////////////////////LOAD VIS/////////////////////////////////////////
					$scope.openLoadPanelModal = function() {

						/*if(!$scope.indexName){
							Notification.error("First select an Index")
							return
						}*/

						ModalService.showModal({
								templateUrl: 'loadpanelmodal.html',
								scope: $scope,
								controller: function($scope, close) {

									//Me traigo las visualizaciones
									var promise = genES.loadAllPanels(ESService.client);

									promise.then(function (resp) {
										console.log("Cargadas: ", resp.hits.hits)
										$scope.loadedpanels = resp.hits.hits;
									})



								}
						}).then(function(modal) {
								modal.element.modal();
								modal.close.then(function(result) {
										console.log("modal cerrado de carga")
								});
						});
					};
					//////////////////////////////////////////////////////////////////////////////


					///////////////////////////////////////////THREEDC/////////////////////////////////////////
					var container, scene, camera, renderer;

	        //objetc which will contain the library functions
	        var dash;

	        init();
	        animate();
					$scope.createNewPanel([100,100,100],4,[500,500],0.6);

	        function init () {

	           ///////////
	           // SCENE //
	           ///////////
	           scene = new THREE.Scene();

	           ////////////
	           // CAMERA //
	           ////////////
						 // attach div element to variable to contain the renderer
						 container = document.getElementById( 'ThreeJSPanels' );

	           // set the view size in pixels (custom or according to window size)
	           var SCREEN_WIDTH = container.clientWidth;
	           var SCREEN_HEIGHT = container.clientHeight;
						 //var SCREEN_WIDTH = window.innerWidth;
	           //var SCREEN_HEIGHT = window.innerHeight;
	           // camera attributes
	           var VIEW_ANGLE = 45;
	           var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
	           var NEAR = 0.1;
	           var FAR = 20000;
	              // set up camera
	           camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	           // add the camera to the scene
	           scene.add(camera);
	           // the camera defaults to position (0,0,0)
	           //    so pull it back (z = 400) and up (y = 100) and set the angle towards the scene origin
	           camera.position.set(-553,584,868);

	           //////////////
	           // RENDERER //
	           //////////////
	           renderer = new THREE.WebGLRenderer( {antialias:true} );
	           renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	           renderer.setClearColor( 0xd8d8d8 );


	           // attach renderer to the container div
	           container.appendChild( renderer.domElement );

	          ////////////
	          // EVENTS //
	          ////////////


	          // automatically resize renderer
	          THREEx.WindowResize(renderer, camera);

	           ///////////
	           // LIGHTS //
	           ///////////
	           var light1 = new THREE.PointLight(0xffffff,0.8);
	           light1.position.set(0,2500,2500);
	           scene.add(light1);

	           var light2 = new THREE.PointLight(0xffffff,0.8);
	           light2.position.set(-2500,2500,-2500);
	           scene.add(light2);

	           var light3 = new THREE.PointLight(0xffffff,0.8);
	           light3.position.set(2500,2500,-2500);
	           scene.add(light3);

	           // create a set of coordinate axes to help orient user
	           //    specify length in pixels in each direction
	           var axes = new THREE.AxisHelper(1000);
	           scene.add(axes);

						 //the empty object will be returned with the library functions
	           dash = THREEDC(camera,scene,renderer,container);


	           dash.renderAll();

	        }

	        function animate(){
	           requestAnimationFrame( animate );
	           render();
	           update();
	        }

	        function render(){
	           renderer.render( scene, camera );
	        }

	        function update(){
	          dash.controls.update();
	        }

					/////////////////////////////////////////////////////////////////////////////////////

				});
      }

      PanelsController.$inject = [ '$scope', 'esFactory', 'ESService', 'ModalService', 'Notification'];

			return PanelsController;

});
