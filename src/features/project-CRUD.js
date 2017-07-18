const APIUtils = require('./../api-utils');

class ProjectCRUD {
  static projectList(callback) {
  	return APIUtils.webstudioJsonRequest(
  		"GET",
  		"/api/studio/v1/projects",
  		{},
  		callback
  	);
  }
}

module.exports = ProjectCRUD;
