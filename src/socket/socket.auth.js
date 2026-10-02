import jwt from "jsonwebtoken";

export const authenticateSocket = (request) => {

    const url = new URL(
        request.url,
        `http://${request.headers.host}`
    );

    const token = url.searchParams.get("token");

    if (!token) {
        throw new Error("Authentication token is required");
    }

    const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
    );

    if (!decodedToken?._id) {
        throw new Error("Invalid access token");
    }

    return decodedToken._id.toString();
};